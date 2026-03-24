const path = require("node:path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { signInWithGoogleDesktop } = require("./googleAuth.cjs");

const devServerUrl = process.env.LYRICTOR_ELECTRON_DEV_SERVER_URL;
const rendererBuildDir = "build-desktop";

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

ipcMain.handle("auth:signInWithGoogle", async (_event, clientId) => {
  const result = await signInWithGoogleDesktop(clientId);
  app.focus({ steal: true });
  return result;
});

app.whenReady().then(() => {
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