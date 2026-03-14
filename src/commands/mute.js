/**
 * 禁言命令
 * 格式: /mute @username {时间}
 * 时间格式: 10m (分钟), 2h (小时), 1d (天), 1w (周), perm (永久)
 * 子命令: /mute list - 显示被禁言用户列表
 *         /mute rem @username - 解除禁言
 */

import { isAdmin } from './permissions.js';

export const name = 'mute';
export const description = '禁言用户（需要管理员权限）';
export const usage = '/mute @用户名 {时间|list|rem @用户名}';
export const aliases = [];

// 时间单位对应的秒数
const TIME_UNITS = {
  'm': 60,        // 分钟
  'h': 3600,      // 小时
  'd': 86400,     // 天
  'w': 604800,    // 周
  'perm': -1      // 永久
};

/**
 * 解析时间字符串
 * @param {string} timeStr - 时间字符串，如 10m, 2h, 1d, 1w, perm
 * @returns {Object} { seconds: number, display: string }
 */
export const parseTime = (timeStr) => {
  if (!timeStr) return null;

  const lower = timeStr.toLowerCase();

  // 永久禁言
  if (lower === 'perm') {
    return { seconds: -1, display: '永久' };
  }

  // 解析数字+单位格式
  const match = lower.match(/^(\d+)(m|h|d|w)$/);
  if (!match) return null;

  const [, num, unit] = match;
  const seconds = parseInt(num) * TIME_UNITS[unit];

  // 生成显示文本
  let display = '';
  switch (unit) {
    case 'm': display = `${num}分钟`; break;
    case 'h': display = `${num}小时`; break;
    case 'd': display = `${num}天`; break;
    case 'w': display = `${num}周`; break;
  }

  return { seconds, display };
};

/**
 * 解析禁言命令
 * @param {string} text - 输入文本
 * @returns {Object|null} 解析结果
 */
export const parse = (text) => {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();

  // 解析 /mute list（列出被禁言用户）
  const listMatch = trimmed.match(/^\/mute\s+list\s*$/i);
  if (listMatch) {
    return { command: 'mute', action: 'list' };
  }

  // 解析 /mute rem @username（解除禁言）
  const remMatch = trimmed.match(/^\/mute\s+rem\s+@?(\S+)\s*$/i);
  if (remMatch) {
    return { command: 'mute', action: 'rem', targetUser: remMatch[1] };
  }

  // 解析 /mute @username {时间}
  const muteMatch = trimmed.match(/^\/mute\s+@?(\S+)\s+(\S+)\s*$/i);
  if (muteMatch) {
    const targetUser = muteMatch[1];
    const timeStr = muteMatch[2];
    const timeResult = parseTime(timeStr);

    if (!timeResult) {
      return { error: '时间格式不正确!支持: 10m (分钟), 2h (小时), 1d (天), 1w (周), perm (永久)' };
    }

    return {
      command: 'mute',
      action: 'mute',
      targetUser: targetUser,
      duration: timeResult.seconds,
      durationDisplay: timeResult.display
    };
  }

  return null;
};

/**
 * 验证命令执行权限
 * @param {Object} params - 命令参数
 * @param {Object} user - 当前用户信息
 * @returns {Object|null} 验证结果，null 表示验证通过
 */
export const validatePermission = (params, user) => {
  if (!isAdmin(user?.role)) {
    return { error: '喵呜~ 这个命令需要管理员权限哦' };
  }
  return null;
};

/**
 * 检查命令是否需要权限
 * @returns {boolean}
 */
export const requiresPermission = () => {
  return true;
};
