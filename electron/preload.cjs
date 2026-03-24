const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lyrictorDesktop", {
  isDesktop: true,
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
  fetchArrayBuffer: (url) => ipcRenderer.invoke("media:fetchArrayBuffer", url),
  cachedFileExists: (filePath) => ipcRenderer.invoke("media:cachedFileExists", filePath),
  signInWithGoogle: (clientId) => ipcRenderer.invoke("auth:signInWithGoogle", clientId),
  resolveYouTubeAudio: (url) => ipcRenderer.invoke("media:resolveYouTubeAudio", url),
});