const path = require("node:path");
const { access, readFile } = require("node:fs/promises");
const { fileURLToPath } = require("node:url");
const { app, BrowserWindow, ipcMain, protocol, shell } = require("electron");
const { signInWithGoogleDesktop } = require("./googleAuth.cjs");
const {
  MEDIA_PROTOCOL,
  getYouTubeCacheDirectory,
  resolveYouTubeAudio,
} = require("./youtubeResolver.cjs");

const devServerUrl = process.env.LYRICTOR_ELECTRON_DEV_SERVER_URL;
const rendererBuildDir = "build-desktop";

protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function getMediaContentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".m4a":
    case ".mp4":
      return "audio/mp4";
    case ".mp3":
      return "audio/mpeg";
    case ".ogg":
    case ".opus":
      return "audio/ogg";
    case ".wav":
      return "audio/wav";
    case ".weba":
    case ".webm":
      return "audio/webm";
    default:
      return "application/octet-stream";
  }
}

function isPathInsideDirectory(filePath, directoryPath) {
  const normalizedDirectoryPath = path.resolve(directoryPath);
  const normalizedFilePath = path.resolve(filePath);

  return (
    normalizedFilePath === normalizedDirectoryPath ||
    normalizedFilePath.startsWith(`${normalizedDirectoryPath}${path.sep}`)
  );
}

function resolveLocalMediaPath(url) {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol === "file:") {
    return fileURLToPath(parsedUrl);
  }

  if (parsedUrl.protocol !== `${MEDIA_PROTOCOL}:`) {
    return undefined;
  }

  if (parsedUrl.hostname !== "youtube-cache") {
    throw new Error(`Unsupported media host: ${parsedUrl.hostname}`);
  }

  const encodedPath = parsedUrl.pathname.startsWith("/")
    ? parsedUrl.pathname.slice(1)
    : parsedUrl.pathname;
  const filePath = decodeURIComponent(encodedPath);
  const cacheDirectory = getYouTubeCacheDirectory();

  if (!isPathInsideDirectory(filePath, cacheDirectory)) {
    throw new Error("Blocked access to media file outside the YouTube cache.");
  }

  return filePath;
}

async function fetchMediaArrayBuffer(url) {
  const localMediaPath = resolveLocalMediaPath(url);

  if (localMediaPath) {
    const fileBuffer = await readFile(localMediaPath);
    return fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
  }

  return response.arrayBuffer();
}

async function loadDevServerWithRetry(mainWindow, attempts = 20) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mainWindow.loadURL(devServerUrl);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw lastError;
}

async function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#050505",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedUrl) => {
      console.error(
        `Electron failed to load URL: ${validatedUrl} with error: ${errorDescription} (${errorCode})`
      );
    }
  );

  if (devServerUrl) {
    loadDevServerWithRetry(mainWindow).catch((error) => {
      console.error("Electron could not load the dev server URL", error);
    });
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return mainWindow;
  }

  mainWindow.loadFile(
    path.join(app.getAppPath(), rendererBuildDir, "index.html")
  );
  return mainWindow;
}

ipcMain.handle("shell:openExternal", async (_event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle("media:fetchArrayBuffer", async (_event, url) => {
  return fetchMediaArrayBuffer(url);
});

ipcMain.handle("media:cachedFileExists", async (_event, filePath) => {
  const cacheDirectory = getYouTubeCacheDirectory();

  if (!isPathInsideDirectory(filePath, cacheDirectory)) {
    return false;
  }

  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("auth:signInWithGoogle", async (_event, clientId) => {
  const result = await signInWithGoogleDesktop(clientId);
  app.focus({ steal: true });
  return result;
});

ipcMain.handle("media:resolveYouTubeAudio", async (_event, url) => {
  const result = await resolveYouTubeAudio(url);
  app.focus({ steal: true });
  return result;
});

app.whenReady().then(async () => {
  protocol.handle(MEDIA_PROTOCOL, async (request) => {
    try {
      const localMediaPath = resolveLocalMediaPath(request.url);

      if (!localMediaPath) {
        return new Response("Unsupported media URL.", { status: 400 });
      }

      const fileBuffer = await readFile(localMediaPath);

      return new Response(fileBuffer, {
        headers: {
          "cache-control": "no-store",
          "content-type": getMediaContentType(localMediaPath),
        },
      });
    } catch (error) {
      return new Response(error.message || "Failed to load cached media.", {
        status: 404,
      });
    }
  });

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});