/**
 * 配置工具 - 加载和管理配置文件
 */

const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const WHITELIST_FILE = path.join(DATA_DIR, 'whitelist.json');

const DEFAULT_CONFIG = {
  enabled: false,
  checkInterval: 3000,
  killUnknown: false,
  notifyOnly: true,
};

const DEFAULT_WHITELIST = {
  processes: [
    'explorer.exe', 'guardian-app.exe', 'electron.exe', 'Code.exe',
    'notepad.exe', 'calc.exe', 'cmd.exe', 'powershell.exe', 'taskmgr.exe'
  ],
  browsers: [
    'chrome.exe', 'msedge.exe', 'firefox.exe', 'opera.exe'
  ],
  urls: [
    'localhost', '127.0.0.1', 'baidu.com', 'qq.com'
  ]
};

function initDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadConfig() {
  initDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch (e) {
    console.error('[Config] 读取配置失败:', e.message);
    return DEFAULT_CONFIG;
  }
}

function loadWhitelist() {
  initDir();
  if (!fs.existsSync(WHITELIST_FILE)) {
    fs.writeFileSync(WHITELIST_FILE, JSON.stringify(DEFAULT_WHITELIST, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(WHITELIST_FILE, 'utf-8'));
  } catch (e) {
    console.error('[Whitelist] 读取白名单失败:', e.message);
    return DEFAULT_WHITELIST;
  }
}

function saveConfig(config) {
  initDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function saveWhitelist(whitelist) {
  initDir();
  fs.writeFileSync(WHITELIST_FILE, JSON.stringify(whitelist, null, 2));
}

module.exports = {
  loadConfig,
  loadWhitelist,
  saveConfig,
  saveWhitelist,
  DEFAULT_CONFIG,
  DEFAULT_WHITELIST,
};
