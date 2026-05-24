const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // Impresoras
  getPrinters: () => ipcRenderer.invoke('get-printers'),

  // Test
  testPrint: () => ipcRenderer.invoke('test-print'),

  // WebSocket status
  getWsStatus: () => ipcRenderer.invoke('get-ws-status'),

  // Eventos del main
  onWsStatus: (cb) => ipcRenderer.on('ws-status', (_, data) => cb(data)),
  onWsClientConnected: (cb) => ipcRenderer.on('ws-client-connected', (_, data) => cb(data)),
  onWsClientDisconnected: (cb) => ipcRenderer.on('ws-client-disconnected', () => cb()),
  onPrintJob: (cb) => ipcRenderer.on('print-job', (_, data) => cb(data)),
  onWsError: (cb) => ipcRenderer.on('ws-error', (_, data) => cb(data)),

  // Cleanup
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
