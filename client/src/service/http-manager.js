/**
 * HTTP 管理器 - 与后端 REST API 通信
 * 用于处理学生绑定、获取房间信息等 HTTP 请求
 */

const os = require('os');

class HttpManager {
  /**
   * 学生绑定 - 向后端提交绑定请求
   * @param {string} serverUrl - 后端服务器地址 (http://host:port)
   * @param {string} joinCode - 接入码
   * @param {string} studentId - 学号
   * @param {string} name - 学生姓名
   * @param {string} clientId - 客户端ID（可选）
   * @returns {Promise<{ok, studentId, name, roomId, roomName, msg}>}
   */
  static async studentBind(serverUrl, joinCode, studentId, name, clientId) {
    try {
      const url = new URL('/api/student/bind', serverUrl);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joinCode,
          studentId: studentId || os.hostname(),
          name: name || '',
          hostname: os.hostname(),
          clientId: clientId || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          msg: data.msg || '绑定失败',
        };
      }

      return {
        ok: true,
        studentId: data.studentId,
        name: data.name,
        roomId: data.roomId,
        roomName: data.roomName,
      };
    } catch (err) {
      return {
        ok: false,
        msg: '网络错误: ' + err.message,
      };
    }
  }

  /**
   * 获取房间信息
   * @param {string} serverUrl - 后端服务器地址
   * @param {string} roomId - 房间ID
   * @returns {Promise<{ok, room, msg}>}
   */
  static async getRoomInfo(serverUrl, roomId) {
    try {
      const url = new URL(`/api/rooms/${roomId}`, serverUrl);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          msg: data.msg || '获取房间信息失败',
        };
      }

      return {
        ok: true,
        room: data.room,
      };
    } catch (err) {
      return {
        ok: false,
        msg: '网络错误: ' + err.message,
      };
    }
  }

  /**
   * 获取房间学生列表
   * @param {string} serverUrl - 后端服务器地址
   * @param {string} roomId - 房间ID
   * @returns {Promise<{ok, students, msg}>}
   */
  static async getRoomStudents(serverUrl, roomId) {
    try {
      const url = new URL(`/api/rooms/${roomId}/students`, serverUrl);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          msg: data.msg || '获取学生列表失败',
        };
      }

      return {
        ok: true,
        students: data.students || [],
      };
    } catch (err) {
      return {
        ok: false,
        msg: '网络错误: ' + err.message,
      };
    }
  }

  /**
   * 获取房间在线客户端列表
   * @param {string} serverUrl - 后端服务器地址
   * @param {string} roomId - 房间ID
   * @returns {Promise<{ok, clients, msg}>}
   */
  static async getRoomClients(serverUrl, roomId) {
    try {
      const url = new URL(`/api/rooms/${roomId}/clients`, serverUrl);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          msg: data.msg || '获取客户端列表失败',
        };
      }

      return {
        ok: true,
        clients: data.clients || [],
      };
    } catch (err) {
      return {
        ok: false,
        msg: '网络错误: ' + err.message,
      };
    }
  }
}

module.exports = HttpManager;
