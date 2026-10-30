// Exposes a tiny, safe API to the local settings/splash pages only.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("plannerDesktop", {
  getSettings: () => ipcRenderer.invoke("planner:get-settings"),
  useLocal: () => ipcRenderer.invoke("planner:use-local"),
  useRemote: (url) => ipcRenderer.invoke("planner:use-remote", url),
  setLan: (opts) => ipcRenderer.invoke("planner:set-lan", opts),
  openDataFolder: () => ipcRenderer.invoke("planner:open-data-folder"),
  openLog: () => ipcRenderer.invoke("planner:open-log"),
  back: () => ipcRenderer.invoke("planner:back"),
});
