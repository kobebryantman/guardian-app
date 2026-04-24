# TODO

---

## 第一阶段：数据模型

- [ ] SQLite schema（teachers + rooms 表）
- [ ] 替换 `state.js` 的 JSON 读写为 SQLite
- [ ] 教师注册/登录 API（替换 `auth.js` 的 admin 校验）
- [ ] 房间 CRUD API（替换 `students.js` 的全局学生管理）
- [ ] 删除或废弃 `admin.json`、`students.json`
- [ ] 绑定流程改造：`bind.js` 按 roomCode 查 room，写入 roomId
- [ ] `ws-handler.js`：bind 消息处理 roomCode + studentId，30s 超时逻辑

## 第二阶段：连通

- [ ] 客户端 `remote-client.js`：bind 流程适配 roomCode
- [ ] 教师端 WebSocket 连接 + 房间订阅
- [ ] 指令按 roomId 路由（broadcast、toggle-guard 只发给房间内在线子机）
- [ ] clients 按 roomId 隔离，教师端只看到自己房间的子机
- [ ] 上线/离线实时推送（学生 bind → 教师端收到通知）
- [ ] 违规模块：攒批缓冲区 + 实时推送教师端

## 第三阶段：完善

- [ ] Web 管理界面适配房间系统
- [ ] 桌面端适配
- [ ] 客户端优化
- [ ] 部署文档
