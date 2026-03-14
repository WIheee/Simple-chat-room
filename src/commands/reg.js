/**
 * 注册用户命令（管理员权限）
 * 格式: /reg {邮箱} {用户名} {密码} {角色}
 */

import { isAdmin } from './permissions.js';

export const name = 'reg';
export const description = '注册新用户（需要管理员权限）';
export const usage = '/reg {邮箱} {用户名} {密码} {角色}';
export const aliases = ['register'];

/**
 * 解析注册命令
 * @param {string} text - 输入文本
 * @returns {Object|null} 解析结果
 */
export const parse = (text) => {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();

  // 解析命令格式: /reg email username password role
  const commandRegex = /^\/(reg|register)\s+(\S+)\s+(\S+)\s+(\S+)\s+(admin|user)\s*$/i;
  const match = trimmed.match(commandRegex);

  if (!match) return null;

  const [, , email, username, password, role] = match;

  // 简单的邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: '邮箱格式不正确' };
  }

  // 用户名长度验证
  if (username.length < 2 || username.length > 20) {
    return { error: '用户名长度应在 2-20 个字符之间' };
  }

  // 密码长度验证
  if (password.length < 4) {
    return { error: '密码长度至少 4 个字符' };
  }

  return {
    command: 'reg',
    email: email,
    username: username,
    password: password,
    role: role.toLowerCase()
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
