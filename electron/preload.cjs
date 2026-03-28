const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lyrictorDesktop", {
  isDesktop: true,
  getAppInfo: () => ipcRenderer.invoke("app:getInfo"),
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
  fetchArrayBuffer: (url) => ipcRenderer.invoke("media:fetchArrayBuffer", url),
  cachedFileExists: (filePath) => ipcRenderer.invoke("media:cachedFileExists", filePath),
  signInWithGoogle: (authBaseUrl) =>
    ipcRenderer.invoke("auth:signInWithGoogle", authBaseUrl),
  resolveYouTubeAudio: (url) => ipcRenderer.invoke("media:resolveYouTubeAudio", url),
});