/**
 * Preload Script - 安全桥梁
 * 将主进程API安全地暴露给渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('guardian', {
  // 数据获取
  getWhitelist: () => ipcRenderer.invoke('get-whitelist'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  getViolations: () => ipcRenderer.invoke('get-violations'),
  getGuardStatus: () => ipcRenderer.invoke('get-guard-status'),
  getProcesses: () => ipcRenderer.invoke('get-processes'),

  // 数据保存
  saveWhitelist: (data) => ipcRenderer.invoke('save-whitelist', data),
  saveConfig: (data) => ipcRenderer.invoke('save-config', data),

  // 守卫控制
  toggleGuard: () => ipcRenderer.invoke('toggle-guard'),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  clearViolations: () => ipcRenderer.invoke('clear-violations'),

  // 远程管控 API
  getRemoteConfig: () => ipcRenderer.invoke('get-remote-config'),
  saveRemoteConfig: (data) => ipcRenderer.invoke('save-remote-config', data),
  bindStudent: (code, studentId, studentName) => ipcRenderer.invoke('bind-student', { joinCode: code, studentId, studentName }),

  // 事件监听
  onGuardStatus: (cb) => ipcRenderer.on('guard-status', (_, v) => cb(v)),
  onViolationsUpdate: (cb) => ipcRenderer.on('violations-update', (_, v) => cb(v)),
  onProcessesUpdate: (cb) => ipcRenderer.on('processes-update', (_, v) => cb(v)),
  onRemoteStatus: (cb) => ipcRenderer.on('remote-status', (_, v) => cb(v)),
  onServerMessage: (cb) => ipcRenderer.on('server-message', (_, v) => cb(v)),
  onWhitelistUpdated: (cb) => ipcRenderer.on('whitelist-updated', (_, v) => cb(v)),

  // 移除监听
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
