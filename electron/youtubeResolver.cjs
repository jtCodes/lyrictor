const { createWriteStream, existsSync } = require("node:fs");
const { chmod, mkdir, readdir } = require("node:fs/promises");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const { app } = require("electron");
const youtubeDlExec = require("youtube-dl-exec");

const { create: createYoutubeDl, constants } = youtubeDlExec;
const MEDIA_PROTOCOL = "lyrictor-media";

let binaryReadyPromise = null;

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
      ? payload.assets.find(({ name }) => name === constants.YOUTUBE_DL_FILE)
      : undefined;

    if (!asset?.browser_download_url) {
      throw new Error(`Could not find yt-dlp asset ${constants.YOUTUBE_DL_FILE} in the latest release.`);
    }

    response = await fetch(asset.browser_download_url, { headers });
  }

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download yt-dlp binary: ${response.status} ${response.statusText}`);
  }

  return response.body;
}

async function ensureYoutubeDlBinary() {
  if (existsSync(constants.YOUTUBE_DL_PATH)) {
    return constants.YOUTUBE_DL_PATH;
  }

  if (!binaryReadyPromise) {
    binaryReadyPromise = (async () => {
      await mkdir(constants.YOUTUBE_DL_DIR, { recursive: true });

      const binaryStream = await getBinaryDownloadStream(constants.YOUTUBE_DL_HOST);

      await pipeline(binaryStream, createWriteStream(constants.YOUTUBE_DL_PATH));
      await chmod(constants.YOUTUBE_DL_PATH, 0o755);

      return constants.YOUTUBE_DL_PATH;
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
  const youtubedl = createYoutubeDl(binaryPath);

  let info;

  try {
    info = await youtubedl(
      url,
      {
        dumpSingleJson: true,
        noPlaylist: true,
        noWarnings: true,
        ignoreConfig: true,
        skipDownload: true,
        format: "bestaudio[protocol^=http][protocol!*=dash]/bestaudio/best",
      },
      {
        timeout: 120000,
        windowsHide: true,
      }
    );
  } catch (error) {
    const message =
      (typeof error?.stderr === "string" && error.stderr.trim()) ||
      (typeof error?.message === "string" && error.message.trim()) ||
      "yt-dlp failed to resolve the YouTube URL.";

    throw new Error(message);
  }

  const audioStreamUrl = pickAudioStreamUrl(info);

  const videoId = info.id || undefined;
  const cacheDirectory = getYouTubeCacheDirectory();
  let cachedAudioFilePath = videoId ? await findCachedAudioFile(videoId) : undefined;

  if (!cachedAudioFilePath) {
    if (!videoId) {
      throw new Error("yt-dlp did not return a stable YouTube video ID for caching.");
    }

    await mkdir(cacheDirectory, { recursive: true });

    const downloadResult = await youtubedl.exec(
      url,
      {
        noPlaylist: true,
        noWarnings: true,
        ignoreConfig: true,
        output: path.join(cacheDirectory, `${videoId}.%(ext)s`),
        format: "bestaudio[protocol^=http][protocol!*=dash]/bestaudio/best",
        print: "after_move:filepath",
      },
      {
        timeout: 120000,
        windowsHide: true,
      }
    );

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