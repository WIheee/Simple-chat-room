/**
 * 列出所有用户命令
 */
import { isAdmin } from './permissions.js';

export const name = 'list';
export const description = '列出所有注册用户';
export const usage = '/list';
export const aliases = ['users'];

export const parse = (text) => {
  const match = text.match(/^\/(list|users)\s*$/i);
  if (!match) return null;
  return { command: 'list' };
};

export const validatePermission = (params, user) => {
  if (!isAdmin(user?.role)) {
    return { error: '喵呜~ 这个命令需要管理员权限哦' };
  }
  return null;
};

export const requiresPermission = () => true;
