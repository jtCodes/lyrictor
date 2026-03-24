const { createWriteStream, existsSync } = require("node:fs");
const { chmod, copyFile, mkdir, readdir } = require("node:fs/promises");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const { app } = require("electron");
const { constants } = require("youtube-dl-exec");
const MEDIA_PROTOCOL = "lyrictor-media";

let binaryReadyPromise = null;

function getYoutubeDlAssetName() {
  if (process.platform === "darwin") {
    return "yt-dlp_macos";
  }

  if (process.platform === "linux") {
    if (process.arch === "arm64") {
      return "yt-dlp_linux_aarch64";
    }

    if (process.arch === "arm") {
      return "yt-dlp_linux_armv7l";
    }

    return "yt-dlp_linux";
  }

  return constants.YOUTUBE_DL_FILE;
}

function getYoutubeDlBinaryDirectory() {
  return path.join(app.getPath("userData"), "yt-dlp-bin");
}

function getYoutubeDlBinaryPath() {
  return path.join(getYoutubeDlBinaryDirectory(), getYoutubeDlAssetName());
}

async function verifyYoutubeDlBinary(binaryPath) {
  if (!existsSync(binaryPath)) {
    return { ok: false, reason: "missing" };
  }

  try {
    await runYoutubeDl(binaryPath, ["--version"], { timeout: 30000 });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: formatYoutubeDlFailure(error),
    };
  }
}

function formatYoutubeDlFailure(error) {
  const stderr = typeof error?.stderr === "string" ? error.stderr.trim() : "";
  const stdout = typeof error?.stdout === "string" ? error.stdout.trim() : "";
  const message = typeof error?.message === "string" ? error.message.trim() : "";
  const signal = typeof error?.signal === "string" ? error.signal : "";
  const exitCode = error?.exitCode;

  return (
    stderr ||
    message ||
    stdout ||
    signal ||
    (exitCode !== undefined && exitCode !== null ? `yt-dlp exited with code ${exitCode}.` : "") ||
    "yt-dlp failed to resolve the YouTube URL."
  );
}

function runYoutubeDl(binaryPath, args, { timeout = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timeoutId = null;

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        child.kill("SIGKILL");
      }, timeout);
    }

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      reject({ message: error.message, stderr, stdout });
    });

    child.on("close", (code, signal) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject({
        message:
          signal === "SIGKILL" && timeout > 0
            ? `yt-dlp timed out after ${timeout}ms`
            : `yt-dlp exited with code ${code}`,
        exitCode: code,
        signal,
        stderr,
        stdout,
      });
    });
  });
}

async function runYoutubeDlJson(binaryPath, args, options) {
  const { stdout, stderr } = await runYoutubeDl(binaryPath, args, options);

  try {
    return JSON.parse(stdout.trim());
  } catch (error) {
    throw {
      message: error.message,
      stderr,
      stdout,
    };
  }
}

async function runYoutubeDlAttempts({ attempts, runAttempt, failureContext }) {
  const failureMessages = [];

  for (const attempt of attempts) {
    try {
      return await runAttempt(attempt.args);
    } catch (error) {
      failureMessages.push(
        `${attempt.label}: ${formatYoutubeDlFailure(error)}`
      );
    }
  }

  throw new Error(
    [failureContext, ...failureMessages].filter(Boolean).join(" | ") ||
      "yt-dlp failed to resolve the YouTube URL."
  );
}

function getYouTubeCacheDirectory() {
  return path.join(app.getPath("userData"), "youtube-audio-cache");
}

function getMediaProtocolUrl(filePath) {
  return `${MEDIA_PROTOCOL}://youtube-cache/${encodeURIComponent(path.resolve(filePath))}`;
}

async function findCachedAudioFile(videoId) {
  const cacheDirectory = getYouTubeCacheDirectory();

  try {
    const fileNames = await readdir(cacheDirectory);
    const matchingFileName = fileNames.find((fileName) => fileName.startsWith(`${videoId}.`));

    return matchingFileName ? path.join(cacheDirectory, matchingFileName) : undefined;
  } catch {
    return undefined;
  }
}

async function getBinaryDownloadStream(url) {
  const youtubeDlAssetName = getYoutubeDlAssetName();
  const headers = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
    ? {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN || process.env.GH_TOKEN}`,
      }
    : undefined;

  let response = await fetch(url, { headers });

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to fetch yt-dlp release metadata: ${response.status} ${response.statusText}`);
    }

    const asset = Array.isArray(payload.assets)
      ? payload.assets.find(({ name }) => name === youtubeDlAssetName)
      : undefined;

    if (!asset?.browser_download_url) {
      throw new Error(`Could not find yt-dlp asset ${youtubeDlAssetName} in the latest release.`);
    }

    response = await fetch(asset.browser_download_url, { headers });
  }

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download yt-dlp binary: ${response.status} ${response.statusText}`);
  }

  return response.body;
}

async function ensureYoutubeDlBinary() {
  const targetBinaryPath = getYoutubeDlBinaryPath();
  const cachedBinaryCheck = await verifyYoutubeDlBinary(targetBinaryPath);
  const bundledBinaryPath = constants.YOUTUBE_DL_PATH;
  const canUseBundledBinary =
    getYoutubeDlAssetName() === constants.YOUTUBE_DL_FILE &&
    existsSync(bundledBinaryPath);

  if (cachedBinaryCheck.ok) {
    return targetBinaryPath;
  }

  if (!binaryReadyPromise) {
    binaryReadyPromise = (async () => {
      const targetBinaryDirectory = getYoutubeDlBinaryDirectory();

      await mkdir(targetBinaryDirectory, { recursive: true });

      if (canUseBundledBinary) {
        await copyFile(bundledBinaryPath, targetBinaryPath);
        await chmod(targetBinaryPath, 0o755);

        const bundledBinaryCheck = await verifyYoutubeDlBinary(targetBinaryPath);
        if (bundledBinaryCheck.ok) {
          return targetBinaryPath;
        }
      }

      {
        const binaryStream = await getBinaryDownloadStream(constants.YOUTUBE_DL_HOST);
        await pipeline(binaryStream, createWriteStream(targetBinaryPath));
      }

      await chmod(targetBinaryPath, 0o755);

      const downloadedBinaryCheck = await verifyYoutubeDlBinary(targetBinaryPath);
      if (!downloadedBinaryCheck.ok) {
        throw new Error(
          `yt-dlp binary is not executable after installation: ${downloadedBinaryCheck.reason}`
        );
      }

      return targetBinaryPath;
    })().finally(() => {
      binaryReadyPromise = null;
    });
  }

  return binaryReadyPromise;
}

function isYouTubeUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    return (
      hostname === "youtu.be" ||
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtube-nocookie.com" ||
      hostname.endsWith(".youtube-nocookie.com")
    );
  } catch {
    return false;
  }
}

function pickThumbnail(info) {
  const thumbnails = Array.isArray(info?.thumbnails) ? info.thumbnails : [];

  if (thumbnails.length === 0) {
    return typeof info?.thumbnail === "string" ? info.thumbnail : undefined;
  }

  const sortedThumbnails = [...thumbnails].sort((left, right) => {
    const leftArea = (left.width || 0) * (left.height || 0);
    const rightArea = (right.width || 0) * (right.height || 0);
    return rightArea - leftArea;
  });

  return sortedThumbnails.find((thumbnail) => typeof thumbnail?.url === "string")?.url;
}

function pickAudioStreamUrl(info) {
  const requestedDownloads = Array.isArray(info?.requested_downloads)
    ? info.requested_downloads
    : [];
  const requestedFormats = Array.isArray(info?.requested_formats)
    ? info.requested_formats
    : [];

  const directCandidates = [
    ...requestedDownloads,
    ...requestedFormats,
    info,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate?.url === "string" && candidate.url.length > 0) {
      return candidate.url;
    }
  }

  const formats = Array.isArray(info?.formats) ? info.formats : [];
  const audioFormats = formats.filter((format) => {
    if (typeof format?.url !== "string" || format.url.length === 0) {
      return false;
    }

    return (
      format.acodec &&
      format.acodec !== "none" &&
      (!format.vcodec || format.vcodec === "none")
    );
  });

  audioFormats.sort((left, right) => {
    const leftProtocolScore = typeof left.protocol === "string" && /^https?$/i.test(left.protocol) ? 1 : 0;
    const rightProtocolScore = typeof right.protocol === "string" && /^https?$/i.test(right.protocol) ? 1 : 0;

    if (leftProtocolScore !== rightProtocolScore) {
      return rightProtocolScore - leftProtocolScore;
    }

    return (right.abr || 0) - (left.abr || 0);
  });

  return audioFormats[0]?.url;
}

async function resolveYouTubeAudio(url) {
  if (!isYouTubeUrl(url)) {
    throw new Error("Not a supported YouTube URL.");
  }

  const binaryPath = await ensureYoutubeDlBinary();

  const info = await runYoutubeDlAttempts({
    attempts: [
      {
        label: "strict-http-audio",
        args: [
          "--dump-single-json",
          "--no-playlist",
          "--no-warnings",
          "--ignore-config",
          "--skip-download",
          "--format",
          "bestaudio[protocol^=http][protocol!*=dash]/bestaudio/best",
          url,
        ],
      },
      {
        label: "bestaudio",
        args: [
          "--dump-single-json",
          "--no-playlist",
          "--no-warnings",
          "--ignore-config",
          "--skip-download",
          "--format",
          "bestaudio/best",
          url,
        ],
      },
      {
        label: "default",
        args: [
          "--dump-single-json",
          "--no-playlist",
          "--no-warnings",
          "--ignore-config",
          "--skip-download",
          url,
        ],
      },
    ],
    failureContext: `yt-dlp metadata resolution failed for ${url}`,
    runAttempt: (args) => runYoutubeDlJson(binaryPath, args, { timeout: 120000 }),
  });

  const videoId = info.id || undefined;
  const cacheDirectory = getYouTubeCacheDirectory();
  let cachedAudioFilePath = videoId ? await findCachedAudioFile(videoId) : undefined;

  if (!cachedAudioFilePath) {
    if (!videoId) {
      throw new Error("yt-dlp did not return a stable YouTube video ID for caching.");
    }

    await mkdir(cacheDirectory, { recursive: true });

    const outputTemplate = path.join(cacheDirectory, `${videoId}.%(ext)s`);

    const downloadResult = await runYoutubeDlAttempts({
      attempts: [
        {
          label: "strict-http-audio",
          args: [
            "--no-playlist",
            "--no-warnings",
            "--ignore-config",
            "--output",
            outputTemplate,
            "--format",
            "bestaudio[protocol^=http][protocol!*=dash]/bestaudio/best",
            "--print",
            "after_move:filepath",
            url,
          ],
        },
        {
          label: "bestaudio",
          args: [
            "--no-playlist",
            "--no-warnings",
            "--ignore-config",
            "--output",
            outputTemplate,
            "--format",
            "bestaudio/best",
            "--print",
            "after_move:filepath",
            url,
          ],
        },
        {
          label: "default",
          args: [
            "--no-playlist",
            "--no-warnings",
            "--ignore-config",
            "--output",
            outputTemplate,
            "--print",
            "after_move:filepath",
            url,
          ],
        },
      ],
      failureContext: `yt-dlp audio download failed for ${url}`,
      runAttempt: (args) => runYoutubeDl(binaryPath, args, { timeout: 120000 }),
    });

    const downloadedFilePath =
      typeof downloadResult?.stdout === "string"
        ? downloadResult.stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .pop()
        : undefined;

    cachedAudioFilePath = downloadedFilePath || (await findCachedAudioFile(videoId));
  }

  if (!cachedAudioFilePath || !existsSync(cachedAudioFilePath)) {
    throw new Error("yt-dlp did not produce a cached audio file.");
  }

  return {
    artistName: info.artist || info.channel || info.uploader || undefined,
    audioFileUrl: getMediaProtocolUrl(cachedAudioFilePath),
    canonicalUrl: info.webpage_url || info.original_url || url,
    cachedAudioFilePath,
    cacheDirectory,
    durationSeconds: typeof info.duration === "number" ? info.duration : undefined,
    thumbnailUrl: pickThumbnail(info),
    title: info.track || info.title || "YouTube audio",
    videoId,
  };
}

module.exports = {
  MEDIA_PROTOCOL,
  getMediaProtocolUrl,
  getYouTubeCacheDirectory,
  isYouTubeUrl,
  resolveYouTubeAudio,
};