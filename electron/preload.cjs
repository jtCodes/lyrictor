const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lyrictorDesktop", {
  isDesktop: true,
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
  signInWithGoogle: (clientId) => ipcRenderer.invoke("auth:signInWithGoogle", clientId),
});