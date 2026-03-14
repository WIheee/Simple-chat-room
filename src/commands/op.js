/**
 * OP 命令 (授予管理员权限)
 * 格式: /op @username
 */

import { ROLES, hasPermission, isAdmin } from './permissions.js';

/**
 * 命令名称
 */
export const name = 'op';

/**
 * 命令别名
 */
export const aliases = [];

/**
 * 命令描述
 */
export const description = '授予用户管理员权限（需要管理员权限）';

/**
 * 命令用法
 */
export const usage = '/op @username';

/**
 * 所需权限
 */
export const requiredPermission = 'canOp';

/**
 * 解析 OP 命令
 * @param {string} text - 输入文本
 * @returns {Object|null} 解析结果
 */
export const parse = (text) => {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();

  // 解析命令格式: /op @username 或 /op username
  const commandRegex = /^\/op\s+@?(\S+)\s*$/;
  const match = trimmed.match(commandRegex);

  if (!match) return null;

  const targetUser = match[1];

  if (!targetUser) {
    return { error: '请指定要授予管理员权限的用户' };
  }

  return {
    command: 'op',
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
