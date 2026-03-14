/**
 * DEOP 命令 (取消管理员权限)
 * 格式: /deop @username
 */

import { ROLES, isAdmin } from './permissions.js';

/**
 * 命令名称
 */
export const name = 'deop';

/**
 * 命令别名
 */
export const aliases = [];

/**
 * 命令描述
 */
export const description = '取消用户管理员权限（需要管理员权限）';

/**
 * 命令用法
 */
export const usage = '/deop @username';

/**
 * 解析 DEOP 命令
 * @param {string} text - 输入文本
 * @returns {Object|null} 解析结果
 */
export const parse = (text) => {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();

  // 解析命令格式: /deop @username 或 /deop username
  const commandRegex = /^\/deop\s+@?(\S+)\s*$/;
  const match = trimmed.match(commandRegex);

  if (!match) return null;

  const targetUser = match[1];

  if (!targetUser) {
    return { error: '请指定要取消管理员权限的用户' };
  }

  return {
    command: 'deop',
    targetUser: targetUser
  };
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
