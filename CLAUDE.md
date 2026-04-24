# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 架构概览

Guardian 是一个 Electron 桌面应用，监控学生机进程和浏览器访问，支持单机自检和远程集中管控两种模式。

```
                      ┌─────────────────┐
                      │ public/control   │
                      │   .html          │
                      └────────┬────────┘
                               │ HTTP / WS
                      ┌────────▼────────┐
                      │   server.js     │
                      │ (Express + WS)  │
                      └────────┬────────┘
                               │ WS /guardian-ws
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │ 学生机 A      │ │ 学生机 B     │ │ 学生机 C     │
      │ remote-client│ │ remote-client│ │ remote-client│
      └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
             │                │                │
             └────────────────┼────────────────┘
                              │ IPC (contextBridge)
                     ┌────────▼────────┐
                     │   src/main.js   │◄── preload.js
                     └────────┬────────┘
                              │ webContents.send
                     ┌────────▼────────┐
                     │ src/renderer/   │
                     │ index.html      │
                     └─────────────────┘
```

## 常用命令

```bash
# 启动 Electron 应用 (开发模式)
npm start

# 启动 Electron 应用 + 开发者工具
npm run dev

# 启动教师端管控服务器
npm run server
# → 浏览器打开 http://localhost:3847 (默认账号: admin / guardian2026)

# 打包为可分发目录 (electron-builder)
npm run build
# → 输出到 release/

# 手动打包 (便携版，直接复制 electron + 项目文件)
node build-package.js
# → 输出到 dist/Guardian访问守卫/

# 验证打包目录
node check-dist.js

# 收尾: 重命名 exe、生成 ico、创建快捷方式 VBS
node finalize.js
```

## 核心文件

| 文件 | 角色 |
|------|------|
| `src/main.js` | Electron 主进程 — 守卫循环、白名单比对、IPC handler、远程连接管理 |
| `src/preload.js` | contextBridge — 安全暴露主进程 API 给渲染进程 |
| `src/renderer/index.html` | 学生机本地界面 (4 个 Tab: 仪表盘/白名单/设置/远程管控) |
| `src/renderer/icon.png` | 应用图标 (用于托盘和窗口) |
| `remote-client.js` | WebSocket 客户端模块 — 被 main.js require，5s 心跳+断线重连 |
| `server.js` | 教师端管控服务器 — Express + WebSocket + REST API，端口 3847 |
| `public/control.html` | 教师端浏览器管控界面 |
| `build-package.js` | 手动打包脚本 — 直接复制 electron.exe + 项目文件到 dist/ |
| `check-dist.js` | 验证打包目录结构 |
| `finalize.js` | 打包后处理 — 重命名 exe、生成 ico、创建快捷方式 VBS |
| `data/whitelist.json` | 进程/浏览器/URL 三级白名单 |
| `data/config.json` | 守卫参数 (检测间隔、是否强杀、是否仅通知) |
| `make_icon.py` | Python 脚本生成 app icon (11 种尺寸的 .ico) |
| `generate-icon.js` | JS 备选图标生成脚本 |

## 守卫检测逻辑

1. 每 `checkInterval` ms (默认 3s) 执行 `runGuardCheck()`
2. 调用 PowerShell: `Get-Process | Where-Object {$_.MainWindowHandle -ne 0} | Select-Object Name,Id,MainWindowTitle`
3. PID+Name+Title 传入 `isProcessAllowed()`:
   - 硬编码系统进程 (20+ 个) → 直接放行
   - 匹配 `whitelist.processes` → 放行
   - 匹配 `whitelist.browsers` → 放行 (但后续可通过窗口标题做 URL 关键词过滤)
   - 其余 → 违规
4. 违规处理: `killUnknown && !notifyOnly` → `taskkill /F /PID`，否则仅记录
5. 违规记录推送到渲染进程 (webContents.send) 和远程服务器 (WS heartbeat)

## 远程管控流程

```
教师浏览器                          server.js                       学生机
    │                                  │                              │
    ├─ POST /api/admin/login           │                              │
    │   → 返回 token                   │                              │
    ├─ POST /api/students              │                              │
    │   → 创建学生，生成 6 位接入码     │                              │
    │                                  │                              │
    │                         学生机 WS 连接 /guardian-ws              │
    │                                  │◄─────────────────────────────│
    │                                  │  ws.send({type:'bind',sid})  │
    │                                  │                              │
    ├─ POST /api/clients/:id           │                              │
    │       /toggle-guard              │                              │
    │─────────────────────────────────►│                              │
    │                                  │ ws.send({type:'toggle-guard'})│
    │                                  │─────────────────────────────►│
    │                                  │                    main.js: 执行
```

## 数据流

- 进程检测: PowerShell → main.js → preload (IPC) → renderer/index.html
- 远程管控: server.js ←WS→ remote-client.js ←require→ main.js ←IPC→ renderer
- 持久化: 全部 JSON 文件在 data/ (无需数据库)

## 安全模型

- 渲染进程通过 `contextBridge` 隔离: `nodeIntegration: false`, `contextIsolation: true`
- 管控 API 使用 JWT-like token (X-Token header, HMAC-SHA1)
- 管理员密码 SHA256 哈希存储
- 进程结束通过 `taskkill /F /PID` (Windows only)

## 打包体系

有三个可相互替代的构建方式:

1. **`npm run build`** — 标准 electron-builder 打包，输出到 release/
2. **`node build-package.js`** — 手动便携打包，直接复制 electron.exe + 项目文件到 dist/，生成启动 bat
3. **`node finalize.js`** — 在 build-package.js 之后运行，重命名 exe、创建 ico 和桌面快捷方式 VBS

便携版 (build-package.js) 只打包运行时依赖 (ws, express, better-sqlite3)，不打包 devDependencies。

## 关键设计决定

- 只检测 `MainWindowHandle ≠ 0` 的进程: 避免扫系统后台进程 (svchost 等)，减少 90%+ 无效扫描，对老旧电脑友好
- 浏览器 URL 检测通过窗口标题推断: 零额外资源占用，Chrome/Edge 标题格式为 `页面标题 - Google Chrome`
- 纯原生 HTML/CSS/JS 渲染: 无 React/Vue 框架，内存占用低
- 日志上限 100 条: 防止内存泄漏
- 教师端无数据库: 全部 JSON 文件持久化，适合机房场景无需额外运维
