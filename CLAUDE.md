# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 目录结构

```
guardian-app/
├── client/                         # 学生端 Electron 应用
│   ├── src/
│   │   ├── main.js                 # 主进程，守卫循环，IPC handle
│   │   ├── preload.js              # contextBridge — 安全桥梁
│   │   ├── remote-client.js        # WebSocket 客户端模块
│   │   └── renderer/
│   │       ├── index.html          # 学生机本地界面 (4 个 Tab)
│   │       └── icon.png            # 应用图标
│   ├── data/
│   │   ├── whitelist.json          # 进程/浏览器/URL 三级白名单
│   │   └── config.json             # 守卫参数
│   ├── tools/
│   │   └── build-package.js        # 手动打包脚本
│   └── package.json                # client 依赖 (electron, ws, better-sqlite3)
├── server/                         # 管控服务器
│   ├── src/
│   │   ├── server.js               # 入口：创建 HTTP 服务
│   │   └── app.js                  # Express：挂载中间件 + 路由
│   ├── router/
│   │   ├── auth.js                 # POST /api/admin/login
│   │   ├── students.js             # CRUD /api/students
│   │   ├── clients.js              # GET /api/clients + 远程管控
│   │   ├── broadcast.js            # POST /api/broadcast
│   │   └── bind.js                 # POST /api/student/bind
│   ├── service/
│   │   ├── state.js                # 共享状态 (students[], clients Map)
│   │   └── ws-handler.js           # WebSocket 消息处理
│   ├── utils/
│   │   ├── storage.js              # JSON 文件读写
│   │   └── auth.js                 # Token + requireAuth
│   ├── assets/
│   │   └── control.html            # 教师端浏览器 UI
│   ├── data/
│   │   ├── admin.json              # 管理员账号
│   │   └── students.json           # 学生记录
│   ├── desktop/
│   │   ├── main.js                 # 教师端桌面程序 (Electron)
│   │   └── icon.png
│   └── package.json                # server 依赖 (express, ws, electron)
├── docs/
│   ├── protocol.md                 # 通信协议规范
│   ├── config.md                   # 房间配置设计
│   ├── tech-stack.md               # 技术栈方案
│   └── communication.md           # 通信架构总览
├── CLAUDE.md
├── README.md
└── .gitignore
```

## 常用命令

```bash
# 学生端
cd client && npm start              # 启动 Electron 应用
cd client && npm run dev            # 启动 + 开发者工具

# 管控服务器
cd server && npm start              # 启动 HTTP+WS → http://localhost:3847
# 默认账号: admin / guardian2026

# 教师端桌面版 (需先启动 server)
cd server && npm run desktop        # Electron 窗口加载管理界面
```

## 模块关系

```
                      ┌─────────────────┐
                      │ server/assets/  │
                      │ control.html    │
                      └────────┬────────┘
                               │ HTTP / WS
                      ┌────────▼────────┐
                      │  server/src/    │
                      │  server.js      │
                      │ (Express + WS)  │
                      └────────┬────────┘
                               │ WS /guardian-ws
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │ 学生机 A      │ │ 学生机 B     │ │ 学生机 C     │
      │ client/      │ │ client/      │ │ client/      │
      └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
             │                │                │
             └────────────────┼────────────────┘
                              │ IPC (contextBridge)
                     ┌────────▼────────┐
                     │ client/src/     │
                     │   main.js       │◄── preload.js
                     └────────┬────────┘
                              │ webContents.send
                     ┌────────▼────────┐
                     │ client/src/     │
                     │ renderer/       │
                     │ index.html      │
                     └─────────────────┘
```

## 守卫检测逻辑

1. 每 `checkInterval` ms (默认 3s) 执行 `runGuardCheck()`
2. 调用 PowerShell: `Get-Process | Where-Object {$_.MainWindowHandle -ne 0} | Select-Object Name,Id,MainWindowTitle`
3. PID+Name+Title 传入 `isProcessAllowed()`:
   - 硬编码系统进程 (20+ 个) → 直接放行
   - 匹配 `whitelist.processes` → 放行
   - 匹配 `whitelist.browsers` → 放行
   - 其余 → 违规
4. 违规处理: `killUnknown && !notifyOnly` → `taskkill /F /PID`
5. 违规记录推送到渲染进程 (webContents.send) 和远程服务器 (WS heartbeat)

## 安全模型

- 渲染进程通过 `contextBridge` 隔离: `nodeIntegration: false`, `contextIsolation: true`
- 管控 API 使用 JWT-like token (X-Token header, HMAC-SHA1)
- 管理员密码 SHA256 哈希存储
- 进程结束通过 `taskkill /F /PID` (Windows only)

## 关键文件

| 文件 | 角色 |
|------|------|
| `client/src/main.js` | 守卫循环、IPC handler |
| `client/src/preload.js` | contextBridge 安全桥梁 |
| `client/src/remote-client.js` | WS 客户端，被 main.js require |
| `client/src/renderer/index.html` | 学生机 UI |
| `server/src/server.js` | 入口，启动 HTTP+WS |
| `server/src/app.js` | Express 挂载路由 |
| `server/service/ws-handler.js` | WS 消息处理 |
| `server/service/state.js` | 共享状态 |
| `server/assets/control.html` | 教师端 UI |
| `server/desktop/main.js` | 教师端桌面版 |

## docs/ 说明

`docs/` 目录包含后续重构的设计方案，目前尚未实现：
- `protocol.md` — 通信协议规范（重构目标）
- `config.md` — 房间配置 + 白名单类型设计（重构目标）
- `tech-stack.md` — 技术栈方案 + 扩容路径（重构目标）
- `communication.md` — 通信架构总览（重构目标）

当前实际运行的是 JSON 文件持久化 + 单管理员模式。
