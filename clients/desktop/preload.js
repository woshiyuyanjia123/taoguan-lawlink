const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("taoguanDesktop", {
  getConfig: () => ipcRenderer.invoke("taoguan:get-config"),
  checkHealth: (url) => ipcRenderer.invoke("taoguan:check-health", url),
  connect: (url) => ipcRenderer.invoke("taoguan:connect", url),
  platform: process.platform
});
