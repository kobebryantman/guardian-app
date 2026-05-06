/**
 * Preload 脚本 - 安全桥梁
 * 学生端简化版：仅暴露绑定、获取信息、上报违规、登出等 API
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('guardian', {
  // 登录窗口：绑定房间
  bindSubmit: (serverUrl, joinCode, studentId, name) =>
    ipcRenderer.invoke('bind:submit', { serverUrl, joinCode, studentId, name }),

  // 悬浮窗：获取学生信息
  getStudentInfo: () => ipcRenderer.invoke('student:getInfo'),

  //扫描当前进程 比对白名单
  scanProcesses: () => ipcRenderer.invoke('process:scan'),
  getWhitelist: () => ipcRenderer.invoke('whitelist:get'),

  // 悬浮窗：上报违规列表（定期心跳）
  reportViolations: (violations) =>
    ipcRenderer.invoke('violations:report', violations),

  // 悬浮窗：登出
  logout: () => ipcRenderer.invoke('student:logout'),

  // 通用事件监听
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_, ...args) => {
      callback(...args);
    });
  },

  // 移除所有监听
  removeListener: (channel) => ipcRenderer.removeAllListeners(channel),
});

