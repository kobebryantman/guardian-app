/**
 * Guardian 学生端 - 主进程
 * 登录窗口 → 绑定成功 → 右下角悬浮窗
 */

const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const os = require('os');
const WsManager = require('./service/ws-manager');
const { loadConfig, saveConfig } = require('./utils/config');
const { exec } = require('child_process');

let loginWindow = null;      // 登录窗口
let floatingWindow = null;   // 右下角悬浮窗
let studentInfo = null;      // 学生信息

// ============ 登录窗口 ============
function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 440,
    height: 460,
    frame: true,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loginWindow.loadFile(path.join(__dirname, 'renderer/login.html'));

  loginWindow.on('closed', () => { loginWindow = null; });
}

// ============ 右下角悬浮窗 ============
function createFloatingWindow() {
  if (floatingWindow) return;

  floatingWindow = new BrowserWindow({
    width: 340,
    height: 280,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  floatingWindow.loadFile(path.join(__dirname, 'renderer/floating.html'));

  // 定位到右下角
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  floatingWindow.setPosition(width - 350, height - 290);

  floatingWindow.on('closed', () => { floatingWindow = null; });
}

// ============ 应用事件 ============
app.whenReady().then(() => {
  createLoginWindow();
  setupIPC();
  initWsManager();
});

app.on('window-all-closed', () => {
  WsManager.disconnect();
  app.quit();
});

app.on('activate', () => {
  if (loginWindow === null && floatingWindow === null) {
    createLoginWindow();
  }
});

// ============ WebSocket 管理器初始化 ============
function initWsManager() {
  WsManager.on('connect', () => {
    console.log('[App] WS 已连接');
    if (loginWindow) loginWindow.webContents.send('ws:connected');
  });

  WsManager.on('disconnect', () => {
    console.log('[App] WS 已断开');
    if (loginWindow) loginWindow.webContents.send('ws:disconnected');
  });

  // 绑定房间反馈
  WsManager.on('bind-ack', (result) => {
    if (result.ok) {
      // 绑定成功，保存学生信息
      studentInfo = {
        studentId: result.studentId || '',
        name: result.name || '未知',
        roomId: result.roomId || '',
        roomName: result.roomName || '未知房间',
      };
      saveConfig(studentInfo);

      // 关闭登录窗口，打开悬浮窗
      if (loginWindow) loginWindow.close();
      createFloatingWindow();

      if (floatingWindow) {
        floatingWindow.webContents.send('student:info', studentInfo);
      }
    } else {
      if (loginWindow) {
        loginWindow.webContents.send('bind:error', result.msg || '绑定失败，请检查接入码');
      }
    }
  });

  // 监听教师指令（学生无权关闭守卫，仅显示提醒）
  WsManager.on('command', (cmd) => {
    if (cmd.type === 'toggle-guard') {
      // 教师远程开关守卫，学生无法手动关闭，只能显示状态
      if (floatingWindow) {
        floatingWindow.webContents.send('guard:status-changed', { enabled: cmd.enabled });
      }
    } else if (cmd.type === 'kill-process') {
      // 教师远程杀进程
      if (floatingWindow) {
        floatingWindow.webContents.send('process:killed', cmd);
      }
    } else if (cmd.type === 'update-whitelist') {
      // 教师更新白名单
      console.log('[App] 收到白名单更新');
    }
  });

  // 监听服务器消息
  WsManager.on('message', (msg) => {
    if (floatingWindow) {
      floatingWindow.webContents.send('server:message', msg);
    }
  });
}

// ============ IPC 处理 ============
function setupIPC() {
  // 登录窗口：绑定房间
  ipcMain.handle('bind:submit', async (event, { serverUrl, joinCode, studentId, name }) => {
    try {
      WsManager.connect(serverUrl);

      // 连接成功后发送绑定请求
      setTimeout(() => {
        WsManager.sendBind({
          studentId: studentId || '',
          joinCode,
          name: name || '',
          hostname: os.hostname(),
        });
      }, 300);

      return { ok: true };
    } catch (err) {
      return { ok: false, msg: err.message };
    }
  });
  //扫描本地进程
  ipcMain.handle('process:scan', async () => {
    return new Promise((resolve) => {
      exec('tasklist /fo csv /nh', (err, stdout) => {
        if (err) { resolve([]); return; }

        const list = [];
        const lines = stdout.trim().split(String.fromCharCode(10));

        for (const line of lines) {
          const m = line.match(/"([^"]+)","(\d+)"/);
          if (m) list.push({ name: m[1], pid: +m[2] });
        }

        resolve(list);
      });
    });
  });
  // 获取当前白名单
  ipcMain.handle('whitelist:get', async () => {
    const { loadWhitelist } = require('./utils/config');
    return loadWhitelist().processes || [];  // whitelist.json 里的 processes 数组
  });

  // 悬浮窗：获取学生信息
  ipcMain.handle('student:getInfo', async () => {
    return studentInfo;
  });

  // 悬浮窗：上报违规进程（定期心跳）
  ipcMain.handle('violations:report', async (event, violations) => {
    if (WsManager.isConnected()) {
      WsManager.sendHeartbeat({
        guardActive: true,  // 学生端通常保持开启
        processCount: violations.length,
        violations,
      });
    }
    return { ok: true };
  });

  // 悬浮窗：通知登出（断开连接）
  ipcMain.handle('student:logout', async () => {
    WsManager.disconnect();
    studentInfo = null;
    if (floatingWindow) floatingWindow.close();
    createLoginWindow();
    return { ok: true };
  });
}
