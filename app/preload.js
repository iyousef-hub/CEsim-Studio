const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('cesimNative', {
  save: (name, text) => ipcRenderer.invoke('cesim-save', { name, text }),
  write: (path, text) => ipcRenderer.invoke('cesim-write', { path, text }),
  saveBinary: (name, b64) => ipcRenderer.invoke('cesim-save-bin', { name, b64 }),
  pdf: (name, svg) => ipcRenderer.invoke('cesim-pdf', { name, svg }),
  pdfHtml: (name, html) => ipcRenderer.invoke('cesim-pdf-html', { name, html }),
  capture: (name) => ipcRenderer.invoke('cesim-capture', { name }),
  ollama: (req) => ipcRenderer.invoke('cesim-ollama', req),
  onOllamaProgress: (fn) => { const h = (e, d) => fn(d); ipcRenderer.on('cesim-ollama-progress', h); return () => ipcRenderer.removeListener('cesim-ollama-progress', h); },
  openTool: (tool) => ipcRenderer.invoke('cesim-open-tool', { tool }),
  openFileDialog: () => ipcRenderer.invoke('cesim-open-dialog'),
  openPath: (p) => ipcRenderer.invoke('cesim-open-path', { p }),
  recent: () => ipcRenderer.invoke('cesim-recent'),
  pathFor: (file) => { try { return webUtils.getPathForFile(file) } catch (e) { return null } },
  platform: process.platform
});
