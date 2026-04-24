# Guardian 访问守卫

机房考试场景下的进程管控系统。

**学生端** (Electron) 定时扫描有窗口进程 → 白名单比对 → 记录或结束违规进程。**管控服务器** (Express + WebSocket) 管理学生身份、下发远程指令、聚合在线状态。**教师端** (浏览器 + Electron 桌面) 实时查看所有子机状态、开关守卫、下发白名单。

系统分三层：学生端的**守卫引擎** (PowerShell 进程扫描 + 白名单引擎) 通过 **WS 通道** 与服务器通信；服务器通过 **REST API** 暴露管理能力给教师端；教师端通过 **WS 订阅** 接收实时推送。

---

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
│   └── package.json                # client 依赖
│
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
│   └── package.json                # server 依赖
│
├── docs/
│   ├── protocol.md                 # 通信协议规范
│   ├── config.md                   # 房间配置设计
│   ├── tech-stack.md               # 技术栈方案
│   └── communication.md           # 通信架构总览
│
├── CLAUDE.md
├── README.md
└── .gitignore
```

---

## 开发

```bash
# 学生端 (Electron)
cd client
npm install
npm start                    # 启动 Electron 应用
npm run dev                  # 启动 + 开发者工具

# 管控服务器
cd server
npm install
npm start                    # 启动 HTTP+WS 服务器 → http://localhost:3847
# 默认账号: admin / guardian2026

# 教师端 (桌面版，在服务器启动后另开终端)
npm run desktop              # Electron 窗口加载管理界面
```

## 启动流程

1. 在服务器上运行 `cd server && npm start`
2. 教师浏览器打开 `http://server-ip:3847`，用 `admin / guardian2026` 登录
3. 「添加学生」→ 输入姓名/班级/座位号 → 生成 6 位接入码
4. 学生在 `client/` 启动 Guardian → 远程管控 Tab → 输入服务器地址 + 接入码绑定
5. 教师在管控界面查看子机状态、远程开关守卫、下发白名单


## docs/ 说明

`docs/` 目录包含后续重构的设计方案，目前尚未实现：
- `protocol.md` — 通信协议规范（重构目标）
- `config.md` — 房间配置 + 白名单类型设计（重构目标）
- `tech-stack.md` — 技术栈方案 + 扩容路径（重构目标）
- `communication.md` — 通信架构总览（重构目标）
