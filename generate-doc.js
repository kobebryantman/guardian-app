/**
 * Guardian 访问守卫 — 技术文档生成脚本
 * 输出：Guardian技术文档.docx
 */

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat, TableOfContents
} = require('docx');

const C = { primary: '1B4F72', accent: '2E86C1', light: 'D6EAF8', text: '2C3E50', code: 'ECF0F1', dark: '17202A', border: 'AED6F1' };

const border = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: 'Microsoft YaHei', size: 36, bold: true, color: C.primary })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, font: 'Microsoft YaHei', size: 28, bold: true, color: C.accent })]
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, font: 'Microsoft YaHei', size: 24, bold: true, color: C.text })]
  });
}
function p(text, spacing = {}) {
  const runs = typeof text === 'string'
    ? [new TextRun({ text, font: 'Microsoft YaHei', size: 22, color: C.text })]
    : text;
  return new Paragraph({ children: runs, spacing: { before: 80, after: 80, ...spacing }, alignment: AlignmentType.JUSTIFIED });
}
function bold(text, color) {
  return new TextRun({ text, font: 'Microsoft YaHei', size: 22, bold: true, color: color || C.text });
}
function bullet(text, level = 0) {
  const runs = typeof text === 'string'
    ? [new TextRun({ text, font: 'Microsoft YaHei', size: 22, color: C.text })]
    : text;
  const indent = level === 0 ? { left: 720, hanging: 360 } : { left: 1080 + level * 360, hanging: 360 };
  return new Paragraph({ numbering: { reference: 'bullets', level }, children: runs, spacing: { before: 60, after: 60 }, indent });
}
function numbered(text, level = 0) {
  const runs = typeof text === 'string'
    ? [new TextRun({ text, font: 'Microsoft YaHei', size: 22, color: C.text })]
    : text;
  return new Paragraph({ numbering: { reference: 'numbers', level }, children: runs, spacing: { before: 60, after: 60 } });
}
function hr() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.border, space: 1 } },
    spacing: { before: 200, after: 200 }, children: []
  });
}
function pb() { return new Paragraph({ children: [new PageBreak()] }); }

function codeBlock(lines) {
  const rows = [];
  lines.split('\n').filter(l => l.length > 0).forEach(line => {
    rows.push(new TableRow({
      children: [new TableCell({
        borders: noBorders,
        shading: { fill: C.code, type: ShadingType.CLEAR },
        margins: { top: 30, bottom: 30, left: 180, right: 180 },
        children: [new Paragraph({ children: [new TextRun({ text: line, font: 'Consolas', size: 17, color: C.dark })] })]
      })]
    }));
  });
  return new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
    borders: { top: border, bottom: border, left: border, right: border, insideH: noBorder, insideV: noBorder },
    rows
  });
}

function makeTable(headers, data, colWidths) {
  const hRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      borders, shading: { fill: C.primary, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      width: { size: colWidths[i], type: WidthType.DXA },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, font: 'Microsoft YaHei', size: 22, bold: true, color: 'FFFFFF' })] })]
    }))
  });
  const dRows = data.map(row => new TableRow({
    children: row.map((cell, i) => new TableCell({
      borders,
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      width: { size: colWidths[i], type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text: cell, font: 'Microsoft YaHei', size: 20, color: C.text })] })]
    }))
  }));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: colWidths, rows: [hRow, ...dRows] });
}

function infoBox(title, lines, bg) {
  const rows = [];
  if (title) rows.push(new TableRow({ children: [new TableCell({
    borders, shading: { fill: bg || C.light, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    children: [new Paragraph({ children: [new TextRun({ text: title, font: 'Microsoft YaHei', size: 22, bold: true, color: C.primary })] })]
  })] }));
  (Array.isArray(lines) ? lines : [lines]).forEach((line, i) => {
    const isLast = i === (Array.isArray(lines) ? lines.length : 1) - 1 && !title;
    rows.push(new TableRow({ children: [new TableCell({
      borders: { top: noBorder, bottom: isLast ? border : noBorder, left: border, right: border },
      shading: { fill: bg || C.light, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 160, right: 160 },
      children: [new Paragraph({ children: [new TextRun({ text: line, font: 'Microsoft YaHei', size: 20, color: C.text })] })]
    })] }));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360], rows });
}

const doc = new Document({
  numbering: { config: [
    { reference: 'bullets', levels: [
      { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      { level: 1, format: LevelFormat.BULLET, text: '\u25E6', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
    ]},
    { reference: 'numbers', levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
    ]}
  ]},
  styles: {
    default: { document: { run: { font: 'Microsoft YaHei', size: 22, color: C.text } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Microsoft YaHei', color: C.primary },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Microsoft YaHei', color: C.accent },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Microsoft YaHei', color: C.text },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 1 } },
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: 'Guardian 访问守卫 — 技术文档', font: 'Microsoft YaHei', size: 18, color: C.accent })]
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 1 } },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: '第 ', font: 'Microsoft YaHei', size: 18, color: C.text }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Microsoft YaHei', size: 18, color: C.text }),
                  new TextRun({ text: ' 页', font: 'Microsoft YaHei', size: 18, color: C.text })]
    })] }) },
    children: [
      // ===== 封面 =====
      new Paragraph({ spacing: { before: 1800, after: 200 }, alignment: AlignmentType.CENTER, children: [] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: 'Guardian 访问守卫', font: 'Microsoft YaHei', size: 64, bold: true, color: C.primary })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 400 },
        children: [new TextRun({ text: '机房网页访问管控软件 完整技术方案', font: 'Microsoft YaHei', size: 32, color: C.accent })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 600 },
        children: [new TextRun({ text: '版本 1.0.0  |  2026 年 4 月', font: 'Microsoft YaHei', size: 22, color: '808B96' })] }),
      pb(),

      // ===== 目录 =====
      new TableOfContents('目  录', { hyperlink: true, headingStyleRange: '1-3' }),
      pb(),

      // ===== 第一章 =====
      h1('第一章 项目概述'),
      hr(),
      h2('1.1 项目背景'),
      p('随着学校机房的普及，如何有效管控学生上网行为、防止访问与学习无关的网站，成为信息化教学的难题。传统硬件防火墙方案成本高、配置复杂，不适合中小规模机房。Guardian 访问守卫正是为解决这一问题而生的轻量级解决方案，基于 Electron 框架构建，运行在每台学生机上，教师通过一台主机即可统一管理整个机房的访问策略。'),
      p([bold('核心特点：')], { before: 120, after: 0 }),
      bullet('面向老旧电脑优化：只检测有窗口的进程，CPU/内存占用极低'),
      bullet('进程白名单机制：非白名单程序无法运行或仅记录'),
      bullet('浏览器 URL 限制：浏览器本身允许，但访问内容受控'),
      bullet('远程集中管控：一台教师机管理所有学生机，实时监控违规行为'),
      bullet('纯离线 JSON 配置：无需数据库，开箱即用'),
      p('', { before: 160, after: 0 }),

      h2('1.2 适用场景'),
      infoBox('主要适用场景', [
        '学校计算机房 — 限制学生访问游戏/娱乐网站',
        '考试环境 — 确保考生只能使用指定软件',
        '图书馆/阅览室 — 公共电脑上网行为管理',
        '企业内部培训 — 专注工作内容，避免分心',
      ], C.light),
      p('', { before: 200, after: 0 }),

      h2('1.3 技术选型理由'),
      makeTable(
        ['技术', '选型理由', '学习价值'],
        [
          ['Electron', '跨平台桌面框架，Node.js + Chromium，一次开发多平台运行', '理解主/渲染进程架构、IPC 通信、Context Bridge'],
          ['WebSocket', '双向实时通信，教师端与学生端状态同步，延迟低', '理解 WebSocket 协议、心跳机制、自动重连'],
          ['Express', '轻量 Node.js HTTP 框架，快速搭建教师端管控 API', '理解 RESTful API 设计、路由、中间件'],
          ['原生 HTML/CSS/JS', '无 React/Vue 依赖，UI 渲染极轻量，适合低配置电脑', '理解 DOM 操作、事件委托、Fetch API'],
          ['PowerShell', 'Windows 系统进程查询，跨语言调用系统命令', '理解 child_process.exec、进程枚举'],
          ['JSON 文件存储', '无数据库依赖，配置持久化简单，数据可读', '理解 fs 文件读写、JSON 序列化'],
        ],
        [2200, 3560, 3600]
      ),
      p('', { before: 200, after: 0 }),
      pb(),

      // ===== 第二章 =====
      h1('第二章 系统架构'),
      hr(),
      h2('2.1 整体拓扑'),
      p('Guardian 由两大部分组成：'),
      numbered('学生端（Guardian）：运行在每台学生电脑上，执行进程监控和守卫逻辑'),
      numbered('教师端（管控服务器）：运行在教师电脑上，提供 Web 管理界面和 WebSocket 服务器'),
      p('', { before: 160, after: 80 }),
      codeBlock(`拓扑结构：

┌──────────────┐    HTTP/WS    ┌────────────────────────┐
│ 教师浏览器    │◄────────────►│ server.js (管控服务器)   │
│ 管控界面 :3847│   REST API   │ Express + WebSocket     │
└──────────────┘              └──────────┬─────────────┘
                                         │ WS 直连
                         ┌───────────────┼───────────────┐
                         ▼               ▼               ▼
                   ┌──────────┐   ┌──────────┐   ┌──────────┐
                   │ 学生机01 │   │ 学生机02 │   │ 学生机03 │
                   │ Guardian │   │ Guardian │   │ Guardian │
                   │(Electron)│   │(Electron)│   │(Electron)│
                   └──────────┘   └──────────┘   └──────────┘`),
      p('', { before: 200, after: 0 }),

      h2('2.2 层级结构'),
      makeTable(
        ['层级', '组件', '说明'],
        [
          ['学生端界面', 'renderer/index.html', 'Electron 渲染进程，纯原生 HTML/CSS/JS'],
          ['安全桥梁', 'src/preload.js', 'Context Bridge 模式，安全暴露主进程 API'],
          ['学生端核心', 'src/main.js', 'Electron 主进程：进程监控、守卫逻辑、托盘'],
          ['子机通信', 'remote-client.js', 'WebSocket 客户端，自动重连，上报状态'],
          ['教师端核心', 'server.js', 'Express + WebSocket：学生管理、认证、指令下发'],
          ['教师端界面', 'public/control.html', '纯 HTML/CSS/JS 单页管控界面'],
        ],
        [2400, 3200, 3760]
      ),
      p('', { before: 200, after: 0 }),

      h2('2.3 文件清单'),
      makeTable(
        ['文件', '类型', '职责', '关键 API'],
        [
          ['src/main.js', 'Electron 主进程', '进程监控、白名单、托盘、IPC', 'getWindowedProcesses, ipcMain'],
          ['src/preload.js', '预加载脚本', '安全桥梁，暴露 guardian 对象', 'contextBridge.exposeInMainWorld'],
          ['src/renderer/index.html', '渲染进程 UI', '学生端管理界面（标签页导航）', 'guardian.toggleGuard'],
          ['server.js', 'Node.js HTTP+WS', '教师端核心：学生注册、认证、管控', 'Express Router, WebSocketServer'],
          ['remote-client.js', 'WebSocket 客户端', '子机连接、心跳、自动重连、指令', 'connect, updateStatus, emit()'],
          ['public/control.html', 'HTML 单页', '教师端管控界面', 'fetch API, WebSocket'],
          ['data/whitelist.json', '数据文件', '进程白名单 + URL 白名单', '进程名数组'],
          ['data/config.json', '数据文件', '程序配置：检测间隔、自动拦截等', 'checkInterval, killUnknown'],
        ],
        [2200, 2000, 3000, 2160]
      ),
      p('', { before: 200, after: 0 }),
      pb(),

      // ===== 第三章 =====
      h1('第三章 核心技术详解'),
      hr(),

      h2('3.1 Electron 主进程 — main.js'),
      h3('3.1.1 进程监控原理（核心洞察）'),
      p('Guardian 的关键设计洞察：普通用户日常使用的程序几乎都有窗口。那些没有窗口的后台服务（svchost.exe、lsass.exe）不应被管控，也无需被扫描。'),
      p('通过 PowerShell 过滤 MainWindowHandle ≠ 0，可以高效获取所有有窗口进程，数量通常只有 10~30 个，远少于系统全部进程（通常 80~150 个）：'),
      codeBlock(`function getWindowedProcesses() {
  return new Promise((resolve) => {
    // MainWindowHandle != 0 表示有可见窗口
    const ps = \`powershell -NoProfile -Command
      "Get-Process | Where-Object {\\$_.MainWindowHandle -ne 0} |
       Select-Object Name,Id,MainWindowTitle | ConvertTo-Json -Compress"\`;
    exec(ps, { timeout: 5000 }, (err, stdout) => {
      if (err) { resolve([]); return; }
      let data = JSON.parse(stdout.trim());
      if (!Array.isArray(data)) data = [data];
      resolve(data.map(p => ({
        name: (p.Name || '') + '.exe',
        pid: p.Id,
        title: p.MainWindowTitle || ''
      })));
    });
  });
}`),
      p([bold('白名单三层结构：')], { before: 160, after: 0 }),
      bullet([bold('processes'), '：完全允许的程序（如 explorer.exe、notepad.exe）'], 0),
      bullet([bold('browsers'), '：允许运行但访问内容受限的浏览器（chrome.exe、msedge.exe 等）'], 0),
      bullet([bold('urls'), '：允许访问的域名白名单（通过浏览器窗口标题检测）'], 0),

      h3('3.1.2 守卫循环（核心逻辑）'),
      p('守卫以固定间隔（默认 3 秒）循环检测，每次执行以下步骤：'),
      numbered('调用 getWindowedProcesses() 获取当前所有有窗口进程'),
      numbered('遍历进程，调用 isProcessAllowed() 比对白名单'),
      numbered('违规进程根据配置执行：仅记录 / taskkill 强制结束'),
      numbered('通过 IPC 通知渲染进程刷新界面'),
      numbered('通过 remote.updateStatus() 上报至管控服务器'),
      codeBlock(`async function runGuardCheck() {
  if (!isGuardActive) return;
  const processes = await getWindowedProcesses();
  const violations = [];

  for (const proc of processes) {
    const check = isProcessAllowed(proc.name);
    if (!check.allowed) {
      violations.push({ pid: proc.pid, name: proc.name, time: new Date() });
      if (config.killUnknown) await killProcess(proc.pid);
    }
  }

  if (violations.length > 0) {
    detectedViolations = [...violations, ...detectedViolations].slice(0, 100);
    if (mainWindow) mainWindow.webContents.send('violations-update', violations);
    if (remote && remote.isConnected()) remote.updateStatus({ guardActive, violations });
  }
}

function startGuard() {
  guardInterval = setInterval(runGuardCheck, config.checkInterval);
  runGuardCheck();  // 立即执行一次
}`),

      h3('3.1.3 IPC 通信设计'),
      p('Electron 的主进程和渲染进程通过 IPC（Inter-Process Communication）通信。Guardian 使用两种模式：'),
      p([bold('invoke / handle（双向请求）')], { before: 120, after: 0 }),
      bullet('渲染进程调用 window.guardian.getConfig() → ipcMain.handle("get-config")'),
      bullet('主进程从磁盘读取配置，返回给渲染进程'),
      p([bold('send / on（主动推送）')], { before: 120, after: 0 }),
      bullet('守卫检测到违规进程 → mainWindow.webContents.send("violations-update", data)'),
      bullet('渲染进程通过 guardian.onViolationsUpdate(cb) 接收通知，刷新违规列表'),
      codeBlock(`// 主进程（main.js）- 注册 IPC 处理器
ipcMain.handle('get-whitelist', () => whitelist);
ipcMain.handle('get-config',    () => config);
ipcMain.handle('save-whitelist', (_, data) => {
  whitelist = data;
  fs.writeFileSync(WHITELIST_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return true;
});

// 主进程主动推送
mainWindow.webContents.send('violations-update', violations);`),
      codeBlock(`// 预加载脚本（preload.js）- contextBridge 安全暴露 API
contextBridge.exposeInMainWorld('guardian', {
  getWhitelist: () => ipcRenderer.invoke('get-whitelist'),
  saveWhitelist: (data) => ipcRenderer.invoke('save-whitelist', data),
  onViolationsUpdate: (cb) => ipcRenderer.on('violations-update', (_, v) => cb(v)),
  onGuardStatus: (cb) => ipcRenderer.on('guard-status', (_, v) => cb(v)),
});`),

      h2('3.2 安全桥梁 — preload.js'),
      h3('3.2.1 为什么需要 preload.js'),
      p('Electron 出于安全考虑，默认隔离渲染进程和主进程：渲染进程无法访问 Node.js API，无法使用 require()，也无法直接调用 Electron API。这防止了恶意网页代码控制操作系统。'),
      p('preload.js 在浏览器页面和 Node.js 环境之间架起一座安全的桥，通过 contextBridge 以受控方式暴露主进程 API：'),
      codeBlock(`// 渲染进程（index.html）中可以直接使用：
const status = await window.guardian.getGuardStatus();

// 而不能直接访问 Node.js：
// require('fs')  ← 禁止，Context Isolation 保护
// process.exit()  ← 禁止，Node Integration 关闭`),

      h2('3.3 渲染进程 UI — index.html'),
      h3('3.3.1 标签页架构'),
      p('学生端 UI 采用底部标签导航（Tab），共 5 个功能页面：'),
      makeTable(
        ['标签', '功能', '技术实现'],
        [
          ['仪表盘', '实时显示守卫状态、进程数量、违规统计', 'guardian.onGuardStatus + setInterval 刷新'],
          ['进程监控', '列出所有有窗口进程，显示是否在白名单', 'guardian.getProcesses + guardian.killProcess'],
          ['违规日志', '记录所有违规行为（时间、进程名、PID）', 'guardian.onViolationsUpdate 事件驱动'],
          ['白名单', '可视化编辑进程/URL 白名单', 'guardian.saveWhitelist / getWhitelist'],
          ['远程管控', '连接教师管控服务器，输入接入码绑定身份', 'remote-client.js + WebSocket'],
        ],
        [1800, 4200, 3360]
      ),
      p('', { before: 200, after: 0 }),

      h3('3.3.2 与主进程的通信（JavaScript 示例）'),
      codeBlock(`// index.html 中的 JavaScript

// 获取配置并初始化 UI
async function initUI() {
  const cfg = await window.guardian.getConfig();
  document.getElementById('interval').value = cfg.checkInterval / 1000;

  const status = await window.guardian.getGuardStatus();
  updateStatusUI(status);
}

// 开启/关闭守卫
toggleBtn.onclick = async () => {
  const newStatus = await window.guardian.toggleGuard();
  updateStatusUI(newStatus);
};

// 监听主进程推送的违规通知（实时刷新）
window.guardian.onViolationsUpdate((violations) => {
  violations.forEach(v => addViolationRow(v));
});`),
      p('', { before: 200, after: 0 }),
      pb(),

      // ===== 第四章 =====
      h1('第四章 远程管控详解'),
      hr(),

      h2('4.1 设计目标'),
      p('在校园机房环境中，通常是一台教师机管理 30~50 台学生机。远程管控模块让教师能够：'),
      bullet('实时查看所有学生机的守卫状态'),
      bullet('一键开启/关闭学生机的守卫'),
      bullet('统一下发白名单配置到所有学生机'),
      bullet('查看每台学生机的违规记录'),
      bullet('按学生姓名查找对应子机'),

      h2('4.2 WebSocket 通信架构'),
      p('Guardian 使用 WebSocket 实现双向实时通信。与传统 HTTP 请求不同，WebSocket 建立连接后可以双向随时推送数据，非常适合监控场景。'),
      codeBlock(`WebSocket 通信流程：

子机（remote-client.js）          教师端（server.js）           教师浏览器（control.html）
      │                              │                              │
      │────── WebSocket 连接 ────────►│                              │
      │                              │                              │
      │◄──── welcome + clientId ─────│                              │
      │                              │                              │
      │────── heartbeat (5s) ───────►│ 存储状态                     │
      │   { guardActive, violations } │                              │
      │                              │────── 状态推送 ─────────────►│ 更新界面
      │                              │                              │
      │                              │◄──── toggle-guard ──────────│ 教师操作
      │                              │                              │
      │◄──── { type, enabled } ──────│                              │
      │   执行开关守卫                │                              │
      │                              │                              │`),
      p('', { before: 200, after: 0 }),

      h2('4.3 教师端认证 — 学生接入码机制'),
      p('为简化管理，Guardian 采用了无需预先注册子机的接入码机制：'),
      numbered('教师在管控界面添加学生姓名 → 系统自动生成 6 位字母数字接入码'),
      numbered('学生启动 Guardian → 进入"远程管控"标签 → 输入接入码'),
      numbered('子机用接入码向 server.js 发起绑定请求'),
      numbered('server.js 验证接入码后，将该 WebSocket 连接标记为对应学生的子机'),
      p([bold('接入码生成：')], { before: 120, after: 0 }),
      codeBlock(`// server.js - 生成 6 位随机接入码
const joinCode = crypto.randomBytes(3).toString('hex').toUpperCase();
// 示例：A3F7K2`),

      h2('4.4 子机端 WebSocket 客户端 — remote-client.js'),
      p('remote-client.js 是子机端的通信模块，主要功能：'),
      bullet('连接教师端 WebSocket 服务器（ws://教师机IP:3847/guardian-ws）'),
      bullet('定时发送心跳（每 5 秒），上报守卫状态和违规记录'),
      bullet('接收教师端下发的指令（开关守卫、更新白名单、强制结束进程）'),
      bullet('自动重连：连接断开后每 5 秒自动尝试重连'),
      codeBlock(`// remote-client.js - 核心连接逻辑
function _doConnect() {
  ws = new WebSocket(serverUrl);

  ws.on('open', () => {
    // 连接成功后立即发送绑定信息
    send({ type: 'bind', studentId, hostname: os.hostname() });

    // 启动心跳定时器（每 5 秒上报状态）
    heartbeatTimer = setInterval(() => {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        guardActive: _guardStatus,
        processCount: _processCount,
        violations: _violations.slice(0, 10)
      }));
    }, 5000);
  });

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.type === 'toggle-guard') {
      emit('command', { action: 'toggle-guard', enabled: msg.enabled });
    }
  });

  ws.on('close', () => {
    emit('disconnect');
    _scheduleReconnect();  // 5 秒后自动重连
  });
}`),
      p('', { before: 200, after: 0 }),

      h2('4.5 教师端服务器 — server.js'),
      p('server.js 集成了 HTTP 服务器（Express）和 WebSocket 服务器（ws）两个组件：'),
      bullet([bold('HTTP 服务器（Express）'), '：提供教师管控 Web UI 的静态文件服务，以及 REST API（学生管理、认证）']),
      bullet([bold('WebSocket 服务器（ws）'), '：与所有子机保持长连接，接收心跳、推送管控指令']),

      h3('4.5.1 REST API 设计'),
      makeTable(
        ['API 端点', '方法', '说明'],
        [
          ['/api/admin/login', 'POST', '教师登录认证，返回 session token'],
          ['/api/students', 'GET', '获取所有学生列表'],
          ['/api/students', 'POST', '添加新学生，生成接入码'],
          ['/api/clients', 'GET', '获取所有在线子机及其状态'],
          ['/api/clients/:id/toggle-guard', 'POST', '远程开关指定子机的守卫'],
          ['/api/clients/:id/update-whitelist', 'POST', '统一下发白名单到指定子机'],
          ['/api/broadcast', 'POST', '广播指令到所有在线子机'],
          ['/api/student/bind', 'POST', '子机用接入码绑定学生身份'],
        ],
        [3400, 1200, 4760]
      ),
      p('', { before: 200, after: 0 }),

      h3('4.5.2 WebSocket 消息类型'),
      makeTable(
        ['消息类型', '方向', '说明'],
        [
          ['welcome', '服务器→子机', '连接成功后服务器发送的欢迎消息，包含 clientId'],
          ['bind', '子机→服务器', '子机绑定学生身份（studentId + hostname）'],
          ['heartbeat', '子机→服务器', '子机定期心跳，上报守卫状态和违规记录'],
          ['heartbeat-ack', '服务器→子机', '心跳确认'],
          ['toggle-guard', '服务器→子机', '教师下发开关守卫指令'],
          ['update-whitelist', '服务器→子机', '教师统一下发白名单'],
          ['broadcast', '服务器→子机', '向所有子机广播消息'],
        ],
        [2600, 1800, 4960]
      ),
      p('', { before: 200, after: 0 }),
      pb(),

      // ===== 第五章 =====
      h1('第五章 数据流与通信流程'),
      hr(),

      h2('5.1 完整数据流图'),
      p('以下是一次完整的违规检测与上报的数据流：'),
      makeTable(
        ['步骤', '发起方', '动作', '接收方'],
        [
          ['1', 'main.js', 'PowerShell getWindowedProcesses() 获取进程列表', 'Windows 系统'],
          ['2', 'main.js', 'isProcessAllowed() 与白名单比对', '内存'],
          ['3', '违规进程', 'violations-update 事件推送', 'renderer UI'],
          ['4', 'main.js', 'remote.updateStatus() 发送心跳', 'server.js (WS)'],
          ['5', 'server.js', '更新 clients Map 中对应子机状态', '内存'],
          ['6', 'server.js', '通过 HTTP /api/clients 返回状态', 'control.html'],
          ['7', '教师浏览器', 'DOM 更新，显示违规记录', '屏幕'],
        ],
        [600, 1800, 4200, 2760]
      ),
      p('', { before: 200, after: 0 }),

      h2('5.2 远程管控指令流程'),
      makeTable(
        ['步骤', '方向', '说明'],
        [
          ['1', '教师操作', '教师在管控界面点击"开启守卫"'],
          ['2', '浏览器→服务器', 'fetch POST /api/clients/:id/toggle-guard'],
          ['3', '服务器', 'server.js 查找到对应 clientId 的 WebSocket 连接'],
          ['4', '服务器→子机', 'ws.send({ type: "toggle-guard", enabled: true })'],
          ['5', 'remote-client.js', '收到消息，emit("command", { action: "toggle-guard", enabled: true })'],
          ['6', 'main.js', '收到指令，startGuard() 启动守卫循环'],
          ['7', '子机→服务器', '下次心跳上报 guardActive: true'],
          ['8', '服务器→浏览器', '管控界面更新，显示"守卫运行中"'],
        ],
        [600, 1800, 6960]
      ),
      p('', { before: 200, after: 0 }),
      pb(),

      // ===== 第六章 =====
      h1('第六章 部署与使用'),
      hr(),

      h2('6.1 环境要求'),
      makeTable(
        ['组件', '要求', '说明'],
        [
          ['操作系统', 'Windows 10/11 及以上', '依赖 PowerShell 进程查询'],
          ['Node.js', 'v16 及以上', 'server.js 和 Electron 运行时需要'],
          ['网络', '教师机与学生机在同一局域网', 'WebSocket 直连，无需公网'],
          ['磁盘空间', '约 200 MB', '含 Electron Chromium 运行文件'],
          ['内存', '建议 4 GB 及以上', '老旧电脑（2GB）可正常运行，仅 UI 略慢'],
        ],
        [2400, 3000, 3960]
      ),
      p('', { before: 200, after: 0 }),

      h2('6.2 教师端部署（一次性）'),
      p([bold('步骤 1：启动管控服务器')], { before: 120, after: 0 }),
      numbered('在教师机上打开 PowerShell，进入项目目录'),
      numbered('运行命令：node server.js'),
      numbered('浏览器打开 http://localhost:3847'),
      numbered('首次登录：admin / guardian2026'),
      p([bold('步骤 2：添加学生')], { before: 160, after: 0 }),
      numbered('登录后点击"添加学生"按钮'),
      numbered('输入学生姓名、班级、座位号'),
      numbered('保存后会生成 6 位接入码（如 A3F7K2）'),
      numbered('将接入码告知对应学生'),
      codeBlock(`# PowerShell 命令
cd d:\\明年计设\\guardian-app
node server.js

# 输出：
# ╔════════════════════════════════════════════╗
# ║   Guardian 管控服务器 启动成功               ║
# ║   教师端 UI:  http://localhost:3847         ║
# ║   默认账号: admin / guardian2026            ║
# ╚════════════════════════════════════════════╝`),

      h2('6.3 学生端部署（每台电脑）'),
      p([bold('步骤 1：启动 Guardian')], { before: 120, after: 0 }),
      numbered('在学生机上打开 PowerShell'),
      numbered('运行命令：node_modules\\.bin\\electron .'),
      p([bold('步骤 2：连接管控服务器')], { before: 160, after: 0 }),
      numbered('点击底部"远程管控"标签'),
      numbered('开启"子机模式"开关'),
      numbered('服务器地址填写：http://教师机IP地址:3847'),
      numbered('点击"保存并连接"'),
      numbered('连接成功后，输入教师给的 6 位接入码，点击"绑定身份"'),

      h2('6.4 快速上手路径（学习建议）'),
      infoBox('学习路径建议', [
        '第 1 步：运行 — 双击 dist\\Guardian访问守卫\\Guardian访问守卫.exe 启动程序',
        '第 2 步：理解 UI — 阅读 src/renderer/index.html，熟悉标签页结构',
        '第 3 步：理解主进程 — 阅读 src/main.js，找到守卫循环 startGuard()',
        '第 4 步：理解通信 — 阅读 src/preload.js，理解 IPC 双向通信',
        '第 5 步：测试白名单 — 修改 data/whitelist.json，添加一个程序名，观察效果',
        '第 6 步：体验远程 — 启动 server.js，用两台电脑测试教师端管控功能',
        '第 7 步：扩展功能 — 尝试增加密码保护、开机自启等（见下章）',
      ], C.light),
      p('', { before: 200, after: 0 }),
      pb(),

      // ===== 第七章 =====
      h1('第七章 扩展方向与进阶学习'),
      hr(),

      h2('7.1 已实现功能'),
      bullet('进程白名单检测（仅检测有窗口进程，低资源占用）'),
      bullet('浏览器 URL 白名单推断（通过窗口标题）'),
      bullet('系统托盘后台运行'),
      bullet('远程集中管控（WebSocket 双向通信）'),
      bullet('学生接入码绑定机制'),
      bullet('教师端统一下发白名单'),
      bullet('Electron 打包为桌面可执行文件'),

      h2('7.2 进阶功能建议'),
      makeTable(
        ['功能', '实现难度', '实现思路', '涉及文件'],
        [
          ['UI Automation 精确 URL 读取', '中等', '用 PowerShell 调用 Windows UI Automation API 读取浏览器地址栏真实 URL', 'main.js - getWindowedProcesses()'],
          ['密码保护', '简单', '在白名单编辑页面增加设置密码功能，守卫操作需要验证', 'main.js + index.html'],
          ['开机自启', '简单', 'Electron app.setLoginItem() API 将程序注册为开机自启', 'main.js - app.whenReady()'],
          ['时间段控制', '中等', '在守卫循环中加入时间判断（如 8:00-17:00 才启用守卫）', 'main.js - runGuardCheck()'],
          ['网络层拦截（修改 hosts）', '中等', '违规域名写入 C:\\Windows\\System32\\drivers\\etc\\hosts 指向 127.0.0.1', 'main.js - 定时任务'],
          ['日志持久化（数据库）', '简单', '将违规记录同时写入 better-sqlite3 数据库，支持历史查询', 'main.js + 新建 logger.js'],
          ['学生主动申请解锁', '中等', '子机可向教师端发送解锁请求，教师审批后临时放行', 'server.js + control.html'],
        ],
        [2600, 1000, 3600, 2360]
      ),
      p('', { before: 200, after: 0 }),

      h2('7.3 核心技术知识点汇总'),
      infoBox('通过本项目可以学习到的技术知识点', [
        'Electron 主/渲染进程架构与 IPC 双向通信',
        'Context Bridge 安全隔离与 preload 机制',
        'Node.js child_process.exec 调用系统命令',
        'PowerShell 命令行进程枚举（Get-Process）',
        'WebSocket 协议：连接建立、心跳维持、自动重连',
        'Express Router 中间件与 RESTful API 设计',
        'JSON 文件作为轻量级持久化存储',
        'Electron 打包（electron-builder）与托盘管理',
        'Git 工作流程（多人协作版本控制）',
        'Node.js 模块化：require/exports 与 CommonJS 规范',
      ], C.light),
      p('', { before: 200, after: 0 }),
      pb(),

      // ===== 第八章 =====
      h1('第八章 常见问题'),
      hr(),
      h2('Q1: 为什么程序退出后仍在托盘？'),
      p('Guardian 默认"最小化到托盘"，关闭窗口后程序仍在后台运行并监控进程。要完全退出，请右键托盘图标 → "退出 Guardian"。'),

      h2('Q2: 为什么有的程序没有被拦截？'),
      p('Guardian 仅检测有窗口的进程（MainWindowHandle ≠ 0）。没有窗口的后台服务（如 Windows Update）不会被检测。同时，浏览器白名单机制基于窗口标题推断 URL，不如 UI Automation 精确。'),

      h2('Q3: 子机连接不上管控服务器？'),
      p('请检查：① server.js 是否已在教师机上运行；② 防火墙是否允许 3847 端口；③ 子机填写的服务器地址是否正确（应填 http://教师机IP:3847，不是 ws://）；④ 教师机和学生机是否在同一局域网'),

      h2('Q4: 如何修改默认白名单？'),
      p('直接编辑 data/whitelist.json 文件，或在程序 UI 的"白名单"标签页中可视化编辑。无需重启程序，保存后自动生效。'),

      h2('Q5: 教师端忘记密码怎么办？'),
      p('编辑 data/admin.json，删除其中的管理员条目。下次启动 server.js 时会自动重建默认账号 admin / guardian2026。'),
      p('', { before: 200, after: 0 }),
      hr(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 200 },
        children: [new TextRun({ text: '— 文档结束 —', font: 'Microsoft YaHei', size: 22, color: '808B96' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: 'Guardian 访问守卫  |  版本 1.0.0  |  2026 年 4 月', font: 'Microsoft YaHei', size: 18, color: 'ABB2B9' })] }),
    ]
  }]
});

const outPath = 'd:/明年计设/guardian-app/Guardian技术文档.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log('文档生成成功:', outPath);
}).catch(err => {
  console.error('生成失败:', err.message);
});
