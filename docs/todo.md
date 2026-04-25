# Guardian RESTful API 接口规范

覆盖三个端：**管控服务器** (Express + WS)、**教师端** (浏览器)、**学生端** (Electron)

---

## 通用约定

- **Base URL**: `http://{server}:3847`
- **Content-Type**: `application/json`
- **认证 Header**: 除特殊说明外，所有请求 Header `x-token`
- **统一响应**: `{ ok: boolean, ...数据 }` 或 `{ ok: false, msg: string }`
- **角色**: admin（系统管理员）和 teacher（教师）两个角色，路由严格分离

---

## 1. 管理员 — `/api/admin`

管理员账号 admin/guardian2026，管理教师账号。

### POST /api/admin/login

管理员登录。

```
Request:
{
  username: string,          // 必填
  password: string           // 必填
}

Response 200:
{
  ok: true,
  token: string,
  role: "admin",
  username: string
}

Response 401:
{ ok: false, msg: "用户名或密码错误" }
```

### GET /api/admin/teachers

教师列表。

```
Response 200:
{
  ok: true,
  teachers: [
    {
      id: "t_xxx",
      staffId: "T001",
      name: "张老师",
      createdAt: "2026-04-20T10:00:00.000Z"
    }
  ]
}
```

### POST /api/admin/teachers

创建教师。

```
Request:
{
  staffId: string,            // 工号，必填，唯一
  name: string,               // 姓名，必填
  password: string            // 登录密码，必填
}

Response 200:
{
  ok: true,
  teacher: { id, staffId, name, createdAt }
}

Response 400:
{ ok: false, msg: "工号已存在" }
```

### GET /api/admin/teachers/:id

教师详情。

```
Response 200:
{
  ok: true,
  teacher: { id, staffId, name, createdAt }
}
```

### PUT /api/admin/teachers/:id

更新教师。

```
Request:
{
  staffId?: string,            // 改工号
  name?: string,               // 改名
  password?: string            // 重置密码
}

Response 200:
{ ok: true, teacher: { id, staffId, name, createdAt } }
```

### DELETE /api/admin/teachers/:id

删除教师（该教师名下不能有房间）。

```
Response 200: { ok: true }
Response 400: { ok: false, msg: "该教师名下还有房间，无法删除" }
```

### GET /api/admin/rooms

查看所有房间（全平台）。

```
Response 200:
{
  ok: true,
  rooms: [
    {
      id: "r_a1b2c3d4",
      roomName: "301 机房",
      joinCode: "A7K2F3",
      teacherId: "t_xyz",
      teacherName: "张老师",
      studentCount: 30,
      onlineCount: 28,
      createdAt: "2026-04-25T08:00:00.000Z",
      guard: { ... },
      schedule: { ... },
      whitelist: { ... }
    }
  ]
}
```

### GET /api/admin/rooms/:id

查看任意房间详情（含在线子机）。

```
Response 200:
{
  ok: true,
  room: { ...全量 Room + clients 列表 }
}
```

### DELETE /api/admin/rooms/:id

删除任意房间。

```
Response 200: { ok: true }
Response 400: { ok: false, msg: "房间内还有在线子机，无法删除" }
```

---

## 2. 教师 — `/api/teacher`

### POST /api/teacher/login

教师登录。

```
Request:
{
  staffId: string,            // 工号，必填
  password: string            // 密码，必填
}

Response 200:
{
  ok: true,
  token: string,
  teacherId: string,
  staffId: string,
  name: string
}

Response 401:
{ ok: false, msg: "工号或密码错误" }
```

### PUT /api/teacher/password

修改密码。

```
Request:
{
  oldPassword: string,         // 旧密码
  newPassword: string          // 新密码
}

Response 200: { ok: true }
Response 401: { ok: false, msg: "旧密码错误" }
```

---

## 3. 房间管理 — `/api/rooms`

全部需认证（Header `x-token`）。教师只能操作自己的房间。

### GET /api/rooms

我的房间列表。

```
Response 200:
{
  ok: true,
  rooms: [
    {
      id: "r_a1b2c3d4",
      roomName: "301 机房",
      joinCode: "A7K2F3",              // 6 位大写接入码
      createdAt: "2026-04-25T08:00:00.000Z",
      studentCount: 30,                 // 本房间注册学生数
      onlineCount: 28,                  // 本房间当前在线子机数
      guard: {
        checkInterval: 3000,            // 检测间隔 ms，范围 [1000, 30000]
        notifyOnly: false,              // true=仅通知不强杀
        autoStartGuard: true            // 绑定后自动启动守卫
      },
      schedule: {
        autoMode: false,                // 到点自动启停
        gracePeriod: 15,                // 迟到宽容分钟
        allowLateJoin: true             // 宽容期后仍可加入
      },
      whitelist: {
        processes: [
          { name: "notepad.exe", path?: "C:\\...", description: "记事本", enabled: true }
        ],
        browsers: [
          { name: "chrome.exe", description?: "说明", enabled: true }
        ],
        urls: [
          { pattern: "exam.xxx.com", type: "allow", description?: "考试服务器" },
          { pattern: "*.baidu.com", type: "deny", description?: "禁止访问" }
        ]
      },
      violations: {
        maxAllowed: 0                   // 0=不限违规次数
      }
    }
  ]
}
```

### POST /api/rooms

创建房间。

```
Request:
{
  roomName: string,                    // 房间名，必填，如 "301 机房"

  guard?: {
    checkInterval?: number,            // 默认 3000
    notifyOnly?: boolean,              // 默认 false
    autoStartGuard?: boolean           // 默认 true
  },
  schedule?: {
    autoMode?: boolean,                // 默认 false
    gracePeriod?: number,              // 默认 15
    allowLateJoin?: boolean            // 默认 true
  },
  whitelist?: {
    processes?: ProcessEntry[],
    browsers?: BrowserEntry[],
    urls?: UrlRule[]
  },
  violations?: {
    maxAllowed?: number                // 默认 0
  },
  students?: [                         // 可选，创建时批量导入
    { studentId: string, name: string }
  ]
}

Response 200:
{ ok: true, room: Room }
```

### GET /api/rooms/:id

房间详情（含在线子机）。

```
Response 200:
{
  ok: true,
  room: {
    ...全量 Room 字段,
    clients: [
      {
        clientId: "c_a1b2c3",
        studentId: "2024001",
        studentName: "张三",
        ip: "192.168.1.10",
        hostname: "PC-01",
        online: true,                    // WebSocket readyState === 1
        guardActive: true,
        processCount: 8,
        lastSeen: 1745568000000,
        violations: [
          { pid: 1234, name: "qq.exe", title: "QQ", time: "14:30:25", action: "detected" }
        ]
      }
    ]
  }
}
```

### PUT /api/rooms/:id

更新房间配置（部分更新）。

```
Request:
{
  roomName?: string,
  guard?: Partial<GuardConfig>,
  schedule?: Partial<ScheduleConfig>,
  whitelist?: Partial<RoomWhitelist>,
  violations?: { maxAllowed?: number }
}

Response 200: { ok: true, room: Room }
```

### DELETE /api/rooms/:id

删除房间（房间内不能有在线子机）。

```
Response 200: { ok: true }
Response 400: { ok: false, msg: "房间内还有在线子机，无法删除" }
```

### POST /api/rooms/:id/start

启动考试。给房间内所有在线子机下发 `toggle-guard: true`。

```
Response 200: { ok: true, sent: 28 }
```

### POST /api/rooms/:id/stop

停止考试。给房间内所有在线子机下发 `toggle-guard: false`。

```
Response 200: { ok: true, sent: 28 }
```

### POST /api/rooms/:id/broadcast

广播消息给房间内所有在线子机。

```
Request:
{
  message: string                        // 通知内容
}

Response 200: { ok: true, sent: 28 }
Response 400: { ok: false, msg: "消息内容不能为空" }
```

---

## 4. 房间内学生 — `/api/rooms/:id/students`

全部需认证。对本房间注册的学生名单做 CRUD。

### GET /api/rooms/:id/students

房间内学生列表。

```
Response 200:
{
  ok: true,
  students: [
    {
      studentId: "2024001",
      name: "张三"
    }
  ]
}
```

### POST /api/rooms/:id/students

添加学生到房间。

```
Request:
{
  studentId: string,           // 学号，必填，同一房间内唯一
  name: string                 // 姓名，必填
}

Response 200:
{ ok: true, student: { studentId, name } }

Response 400:
{ ok: false, msg: "该学号已在本房间中" }
```

### DELETE /api/rooms/:id/students/:studentId

从房间移除学生。

```
Response 200: { ok: true }
```

---

## 5. 房间内子机管控 — `/api/rooms/:id/clients`

全部需认证。

### GET /api/rooms/:id/clients

房间内在线的子机列表。

```
Response 200:
{
  ok: true,
  clients: [
    {
      clientId: "c_a1b2c3",
      studentId: "2024001",
      studentName: "张三",
      ip: "192.168.1.10",
      hostname: "PC-01",
      online: true,
      guardActive: true,
      processCount: 8,
      lastSeen: 1745568000000,
      violations: [...]
    }
  ]
}
```

### POST /api/rooms/:id/clients/:cid/toggle-guard

开关指定子机守卫。

```
Request:
{
  enabled?: boolean            // 缺省则取反当前状态
}

Response 200: { ok: true }
Response 404: { ok: false, msg: "子机不在线" }
```

### POST /api/rooms/:id/clients/:cid/kill

结束子机指定进程。

```
Request:
{
  pid: number                  // 目标进程 PID
}

Response 200: { ok: true }
```

### POST /api/rooms/:id/clients/:cid/update-whitelist

下发白名单到指定子机。

```
Request:
{
  whitelist: {
    processes: ProcessEntry[],
    browsers: BrowserEntry[],
    urls: UrlRule[]
  }
}

Response 200: { ok: true }
```

---

## 6. 学生绑定 — `/api/student`

### POST /api/student/bind

学生子机通过接入码绑定到房间。**不**需要认证（子机首次连接时调用）。

```
Request:
{
  joinCode: string,                   // 6 位房间接入码，必填
  studentId: string,                  // 学号，必填
  name: string,                       // 姓名，必填
  hostname?: string,                  // 子机计算机名
  clientId?: string                   // WS 连接 ID
}

Response 200:
{
  ok: true,
  studentId: "2024001",
  name: "张三",
  roomId: "r_a1b2c3d4",
  roomName: "301 机房"
}

Response 400:
{ ok: false, msg: "缺少接入码或学号" }

Response 404:
{ ok: false, msg: "无效的接入码" }
{ ok: false, msg: "该学号未在本房间注册" }
```

逻辑：
1. 用 `joinCode` 查 `rooms.json` → 不存在返回 404
2. 在 room.students 中匹配 `studentId` → 找不到返回 404
3. 如果传了 `clientId` → 更新该 WS 连接的 `studentId`、`roomId`、`name`
4. 返回学生和房间信息

---

## 7. WebSocket 协议 — `/guardian-ws`

### 7.1 连接生命周期

```
学生机                         管控服务器
  │                               │
  │  1. WS connect /guardian-ws   │
  │ ─────────────────────────────►│
  │                               │
  │  ◄── 2. { type: "welcome",   │
  │           clientId: "c_xxx" } │
  │                               │
  │  ═══════ 30s 超时窗口 ═══════ │
  │     超时未 bind → 服务端断开  │
  │                               │
  │  3. { type: "bind",          │
  │       roomCode: "A7K2F3",    │
  │       studentId: "2024001",  │
  │       name: "张三",          │
  │       hostname: "PC-01" }    │
  │ ─────────────────────────────►│
  │                               │
  │    验证 roomCode + studentId  │
  │    绑定到 room                │
  │                               │
  │  ◄── 4. { type: "bind-ack",  │
  │           ok: true,           │
  │           roomId: "r_xxx",   │
  │           roomName: "301" }   │
  │           (或 ok: false,      │
  │            msg: "房间码无效" }│
  │                               │
  │  ═══════ 通信阶段 ═══════    │
  │                               │
  │  5. { type: "heartbeat",     │
  │       guardActive: true,      │
  │       processCount: 8,        │
  │       violations: [...] }     │
  │ ─────────────────────────────►│
  │                               │
  │  ◄── 6. { type: "heartbeat-  │
  │           ack" }              │
  │                               │
  │  ◄── 7. { type: "toggle-     │
  │           guard",             │
  │           enabled: true }     │
  │                               │
  │  ◄── 8. { type: "update-     │
  │           whitelist",         │
  │           whitelist: {...} }  │
  │                               │
  │  ◄── 9. { type: "force-kill- │
  │           process",           │
  │           pid: 1234 }         │
  │                               │
  │  ◄── 10. { type: "broadcast",│
  │            message: "..." }   │
  │                               │
  │  ── 11. WS disconnect ──────►│
  │           服务端标记离线       │
```

### 7.2 消息类型总表

#### 学生机 → 管控服务器

| type | 时机 | 载荷 | 服务端行为 |
|------|------|------|-----------|
| `bind` | 连接后 30s 内 | `{ roomCode, studentId, name, hostname }` | 验证 roomCode + studentId，绑到房间，发 `bind-ack` |
| `heartbeat` | 每 5s | `{ guardActive, processCount, violations[] }` | 更新状态，发 `heartbeat-ack` |
| `violation-log` | 发现违规时 | `{ violations[] }` | 合并到服务端记录 |

#### 管控服务器 → 学生机

| type | 时机 | 载荷 | 说明 |
|------|------|------|------|
| `welcome` | WS 连接成功 | `{ clientId }` | 标识该连接 |
| `bind-ack` | bind 处理完 | `{ ok, roomId, roomName }` 或 `{ ok: false, msg }` | 失败不关闭连接，允许重试 |
| `heartbeat-ack` | 收到 heartbeat | `{}` | 仅确认 |
| `toggle-guard` | 教师远程开关 | `{ enabled: boolean }` | 学生端启停守卫循环 |
| `update-whitelist` | 教师下发白名单 | `{ whitelist: RoomWhitelist }` | 学生端更新 whitelist.json |
| `force-kill-process` | 教师结束进程 | `{ pid: number }` | 学生端执行 taskkill |
| `broadcast` | 教师发通知 | `{ message: string }` | 学生端弹窗显示 |

### 7.3 异常处理

| 场景 | 行为 |
|------|------|
| WS 断开 | 服务端清理 clients，标记离线 |
| 服务端宕机 | 学生端 5s 自动重连，无限重试 |
| bind 失败（roomCode/studentId 无效） | 返回 `{ ok: false, msg }`，不关闭连接，允许重试 |
| 心跳超时 120s | 服务端主动 terminate，清理 clients |

---

## 8. 数据模型

### Teacher

```json
{
  "id": "t_a1b2c3d4",
  "staffId": "T001",
  "name": "张老师",
  "passwordHash": "sha256$...",
  "createdAt": "2026-04-20T10:00:00.000Z"
}
```

### Room

```json
{
  "id": "r_a1b2c3d4",
  "teacherId": "t_xyz",
  "roomName": "301 机房",
  "joinCode": "A7K2F3",
  "createdAt": "2026-04-25T08:00:00.000Z",
  "guard": {
    "checkInterval": 3000,
    "notifyOnly": false,
    "autoStartGuard": true
  },
  "schedule": {
    "autoMode": false,
    "gracePeriod": 15,
    "allowLateJoin": true
  },
  "whitelist": {
    "processes": [
      { "name": "exam.exe", "path": "C:\\Exam\\exam.exe", "description": "考试系统", "enabled": true }
    ],
    "browsers": [
      { "name": "chrome.exe", "description": "仅用于考试系统", "enabled": true }
    ],
    "urls": [
      { "pattern": "exam.xxx.com", "type": "allow", "description": "考试服务器" }
    ]
  },
  "violations": {
    "maxAllowed": 0
  },
  "students": [
    { "studentId": "2024001", "name": "张三" },
    { "studentId": "2024002", "name": "李四" }
  ]
}
```

### Student

```json
{
  "studentId": "2024001",
  "name": "张三"
}
```

### ClientInfo（纯内存，不持久化）

```json
{
  "ws": "<WebSocket>",
  "ip": "192.168.1.10",
  "clientId": "c_a1b2c3",
  "studentId": "2024001",
  "studentName": "张三",
  "roomId": "r_a1b2c3d4",
  "hostname": "PC-01",
  "lastSeen": 1745568000000,
  "guardActive": true,
  "violations": [],
  "processCount": 8,
  "bindAt": 1745568000000
}
```

### Violation

```json
{
  "pid": 1234,
  "name": "qq.exe",
  "title": "QQ",
  "time": "14:30:25",
  "action": "detected"
}
```

### ProcessEntry / BrowserEntry / UrlRule

```json
// ProcessEntry
{ "name": "notepad.exe", "path": "C:\\...", "description": "记事本", "enabled": true }

// BrowserEntry
{ "name": "chrome.exe", "description": "说明", "enabled": true }

// UrlRule
{ "pattern": "exam.com", "type": "allow", "description": "考试服务器" }
```
