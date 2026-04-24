# 房间配置系统设计

---

## 1. 配置层级

```
全局默认配置 (server/data/default-config.json)
    │
    ├── 教师账户注册时继承 ──→ 教师级别默认配置 (可选)
    │
    ├── 教师创建房间时覆盖 ──→ 房间配置 (持久化到 rooms.json)
    │
    └── 教师实时指令覆盖 ──→ 运行时配置 (仅内存，不持久化)
```

**合并规则**: 运行时配置 > 房间持久配置 > 全局默认

---

## 2. 房间完整配置结构

```typescript
interface RoomConfig {
  /** 房间基本信息 */
  roomName: string;            // 如 "301 机房"
  joinCode: string;            // 6 位接入码，创建时自动生成

  /** 守卫行为 */
  guard: GuardConfig;

  /** 时间窗口 (null = 完全手动) */
  schedule?: ScheduleConfig;

  /** 白名单 (每个房间独立) */
  whitelist: RoomWhitelist;

  /** 违规策略 */
  violations: ViolationConfig;
}

// ─────────────────────────────────────

interface GuardConfig {
  checkInterval: number;       // 检测间隔 (ms)
                               //   默认 3000，老旧电脑建议 5000-10000
                               //   范围 [1000, 30000]

  notifyOnly: boolean;         // true  = 仅通知，不强杀
                               // false = 自动结束违规进程
                               // 考试场景建议 false

  autoStartGuard: boolean;     // true  = 学生绑定后自动开启守卫
                               // false = 需教师手动开启
                               // 考试场景建议 true
}

// ─────────────────────────────────────

interface ScheduleConfig {
  autoMode: boolean;           // true  = 到点自动启停守卫
                               // false = 手动控制，忽略以下时间字段

  startTime?: string;          // ISO 8601，如 "2026-04-25T08:00:00+08:00"
                               // autoMode=true 时必填

  endTime?: string;            // ISO 8601，autoMode=true 时必填

  gracePeriod: number;         // 迟到宽容 (分钟)
                               //   开考后 gracePeriod 分钟内仍允许绑定
                               //   超过后拒绝新 bind 请求

  allowLateJoin: boolean;      // true  = gracePeriod 后仍可加入 (但记录迟到)
                               // false = gracePeriod 后拒绝所有新绑定
}

// ─────────────────────────────────────

interface ViolationConfig {
  maxAllowed: number;          // 0 = 不限制违规次数
                               // N = 允许 N 次违规后触发策略
                               // 考试场景建议 0 (无限制，仅记录)

  notifyTeacher: boolean;      // true = 每条违规实时推送到教师端
}
```

---

## 3. 白名单类型设计

```typescript
// ─────────────────────────────────────
// 进程白名单条目
// ─────────────────────────────────────
interface ProcessEntry {
  name: string;                // 进程名，精确匹配 exe 名
                               //   如 "notepad.exe"、"exam.exe"
                               //   大小写不敏感

  path?: string;              // 可选：完整可执行文件路径
                               //   如 "C:\Program Files\Exam\exam.exe"
                               //   填写后同时校验路径，防止同名欺骗
                               //   不填则仅匹配进程名

  description?: string;       // 说明，如 "考试答题系统"
                               //   仅用于教师端 UI 展示

  enabled: boolean;            // true  = 在白名单中生效
                               // false = 临时禁用但保留记录
}

// ─────────────────────────────────────
// 浏览器条目
// ─────────────────────────────────────
interface BrowserEntry {
  name: string;                // 如 "chrome.exe"、"msedge.exe"
                               //   大小写不敏感

  description?: string;       // 仅 UI 展示

  enabled: boolean;
}

// ─────────────────────────────────────
// URL 规则
// ─────────────────────────────────────
interface UrlRule {
  pattern: string;             // 匹配模式，支持通配符
                               //   exam.com         → 精确域名 (含所有子路径)
                               //   *.exam.com       → 子域名通配
                               //   exam.com/*       → 指定路径及其子路径
                               //   *.exam.com/*     → 子域名 + 路径

  type: "allow" | "deny";     // allow = 允许访问
                               // deny  = 禁止访问
                               // 优先匹配 deny，再匹配 allow

  description?: string;       // 如 "考试服务器地址"
}

// ─────────────────────────────────────
// 完整白名单结构
// ─────────────────────────────────────
interface RoomWhitelist {
  processes: ProcessEntry[];   // 考试允许运行的软件
  browsers: BrowserEntry[];    // 允许的浏览器
  urls: UrlRule[];             // URL 访问规则
}
```

### 白名单匹配流程

```
收到违规检测请求 (进程名 / URL)
  │
  ├─ 命中 process[].name (且 enabled=true)
  │     └─ 放行
  │
  ├─ 命中 browsers[].name (且 enabled=true)
  │     ├─ 是浏览器进程，继续检查 URL
  │     │     ├─ 无 URL 规则 → 放行
  │     │     └─ 按 urls[].pattern 匹配
  │     │           ├─ 命中 deny → 拦截
  │     │           └─ 仅命中 allow → 放行
  │     └─ 无 URL 检测需求 → 放行
  │
  └─ 未命中任何白名单 → 违规
```

---

## 4. JSON 持久化示例

### rooms.json

```json
[
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
        { "name": "exam.exe", "path": "C:\\Exam\\exam.exe", "description": "考试系统", "enabled": true },
        { "name": "notepad.exe", "description": "记事本", "enabled": true },
        { "name": "calc.exe", "description": "计算器", "enabled": false }
      ],
      "browsers": [
        { "name": "chrome.exe", "description": "仅用于考试系统", "enabled": true }
      ],
      "urls": [
        { "pattern": "exam.xxx.com", "type": "allow", "description": "考试服务器" },
        { "pattern": "*.baidu.com", "type": "deny", "description": "禁止搜索" }
      ]
    },
    "violations": {
      "maxAllowed": 0,
      "notifyTeacher": true
    }
  }
]
```

### teachers.json

```json
[
  {
    "id": "t_xyz",
    "username": "zhang",
    "passwordHash": "sha256$...",
    "displayName": "张老师",
    "createdAt": "2026-04-20T10:00:00.000Z"
  }
]
```

### clients (内存 Map，不持久化)

```
Map {
  "c_a1b2c3" => {
    ws: <WebSocket>,
    ip: "192.168.1.10",
    clientId: "c_a1b2c3",
    studentId: "2024001",
    studentName: "张三",
    roomId: "r_a1b2c3d4",
    hostname: "PC-01",
    lastSeen: 1745568000000,
    guardActive: true,
    violations: [],
    processCount: 8,
    bindAt: 1745568000000
  }
}
```

---

## 5. 配置变更传播路径

```
教师端 UI                       服务器                        学生机
  │                               │                            │
  │ PUT /api/rooms/:id            │                            │
  │ { whitelist: {...} }          │                            │
  │ ─────────────────────────────►│                            │
  │                               ├─ 更新 rooms.json           │
  │                               ├─ 遍历 room 内在线子机      │
  │                               │                            │
  │                               │ WS { update-whitelist }    │
  │                               │ ──────────────────────────►│
  │                               │          main.js 更新白名单 │
  │                               │          IPC 通知 renderer  │
  │                               │                            │
  │ ◄── { ok: true }              │                            │
```

```
教师端 UI                       服务器                        学生机
  │                               │                            │
  │ POST /api/rooms/:id/start     │                            │
  │ ─────────────────────────────►│                            │
  │                               ├─ 遍历 room 内在线子机      │
  │                               │                            │
  │                               │ WS { toggle-guard,        │
  │                               │      enabled: true }       │
  │                               │ ──────────────────────────►│
  │                               │          main.js 启动守卫   │
  │                               │                            │
  │ ◄── { ok: true, sent: 30 }    │                            │
```
