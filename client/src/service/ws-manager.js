// 服务端地址：ws://{host}:3847/guardian-ws

const WebSocket = require('ws');
const os = require('os');
const EventEmitter = require('events');

class WsManager extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.serverUrl = null;
    this.clientId = null;    // 服务端分配的 clientId（welcome 消息下发）
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
  }

  //连接
  /**
   * 连接服务端 WebSocket
   * @param {string} serverUrl - 如 "http://localhost:3847"（自动转 ws）
   */
  connect(serverUrl) {
    if (this.ws && this.ws.readyState < WebSocket.CLOSED) return;
    this.serverUrl = serverUrl.replace(/^http/, 'ws');
    this._doConnect();
  }

  _doConnect() {
    const url = this.serverUrl + '/guardian-ws';
    console.log('[WS] 连接中...', url);
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('[WS] TCP 连接已建立，等待 welcome...');
      // 不在这里 emit connect，要等收到 welcome 才算真正连上
    });

    this.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        this._handleMessage(msg);
      } catch (e) {
        console.warn('[WS] 消息解析失败:', e.message);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`[WS] 连接关闭: ${code} ${reason}`);
      this.clientId = null;
      this._stopHeartbeat();
      this.emit('disconnect', { code, reason });
      this._scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[WS] 错误:', err.message);
      this.emit('error', err);
    });
  }

  disconnect() {
    this._cancelReconnect();
    this._stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'client disconnect');
      this.ws = null;
    }
    this.clientId = null;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN && !!this.clientId;
  }

  // 消息处理
  _handleMessage(msg) {
    // 所有消息必须带 type 字段（asyncapi.yaml 每个 payload 都有 required: [type]）
    if (!msg || !msg.type) return;

    switch (msg.type) {

      // ---------- WelcomeMessage ----------
      case 'welcome':
        this.clientId = msg.clientId;  // 必填字段
        console.log(`[WS] 收到 welcome, clientId=${this.clientId}`);
        this.emit('welcome', { clientId: msg.clientId });
        this.emit('connect');  // 真正连上才 emit
        this._startHeartbeat();
        break;

      // ---------- BindAckMessage ----------
      case 'bind-ack':
        console.log('[WS] 绑定结果:', msg.ok, msg.msg || '');
        this.emit('bind-ack', {
          ok: msg.ok,
          roomId: msg.roomId,      // ok=true 时存在
          roomName: msg.roomName,  // ok=true 时存在
          msg: msg.msg,            // ok=false 时存在
        });
        break;

      // ---------- HeartbeatAckMessage ----------
      case 'heartbeat-ack':
        // 服务端确认，静默处理
        break;

      // ---------- ToggleGuardMessage ----------
      case 'toggle-guard':
        this.emit('command', {
          type: 'toggle-guard',
          enabled: msg.enabled,  // 必填，boolean
        });
        break;

      // ---------- UpdateWhitelistMessage ----------
      case 'update-whitelist':
        this.emit('command', {
          type: 'update-whitelist',
          whitelist: msg.whitelist,  // 必填，RoomWhitelist 对象
        });
        break;

      // ---------- ForceKillProcessMessage ----------
      case 'force-kill-process':
        this.emit('command', {
          type: 'kill-process',
          pid: msg.pid,  // 必填，integer
        });
        break;

      // ---------- BroadcastMessage ----------
      case 'broadcast':
        this.emit('message', msg.message);  // 必填，string
        break;

      default:
        console.warn('[WS] 未知消息类型:', msg.type);
    }
  }

  // 客户端发送消息
  /**
   * 发送：绑定房间
   * 对应 asyncapi.yaml: BindMessage / BindPayload
   * 必填：type, studentId
   * 可选：roomCode, joinCode, name, hostname
   */
  sendBind({ studentId, joinCode, name, hostname }) {
    return this._send({
      type: 'bind',           // 必填，enum[bind]
      joinCode: joinCode || '', // 可选（兼容字段）
      studentId,                // 必填
      name: name || '',         // 可选
      hostname: hostname || os.hostname(), // 可选
    });
  }

  /**
   * 发送：心跳上报
   * 对应 asyncapi.yaml: HeartbeatMessage / HeartbeatPayload
   * 必填：type
   * 可选：guardActive, processCount, violations
   */
  sendHeartbeat({ guardActive, processCount, violations }) {
    return this._send({
      type: 'heartbeat',           // 必填，enum[heartbeat]
      guardActive,                   // 可选，boolean
      processCount,                  // 可选，integer
      violations: violations || [],  // 可选，ViolationEntry[]
    });
  }

  /**
   * 发送：违规日志上报
   * 对应 asyncapi.yaml: ViolationLogMessage / ViolationLogPayload
   * 必填：type
   * 可选：violations
   */
  sendViolationLog(violations) {
    return this._send({
      type: 'violation-log',        // 必填，enum[violation-log]
      violations: violations || [],  // 可选，ViolationEntry[]
    });
  }

  // ==================== 内部方法 ====================

  _send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    // 心跳间隔 30 秒（服务端每 30 秒巡检）
    this.heartbeatTimer = setInterval(() => {
      this.emit('heartbeat-tick');
      // 实际使用时要提供 guardActive/processCount/violations 数据
      // 由外部在 heartbeat-tick 事件里调用 sendHeartbeat()
    }, 30000);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[WS] 尝试重连...');
      this._doConnect();
    }, 5000);
  }

  _cancelReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

module.exports = new WsManager();
