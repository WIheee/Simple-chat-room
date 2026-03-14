/**
 * 删除用户命令
 */
import { isAdmin } from './permissions.js';

export const name = 'kick';
export const description = '删除指定用户的账户';
export const usage = '/kick @用户名';
export const aliases = ['ban'];

export const parse = (text) => {
  const match = text.match(/^\/(kick|ban)\s+@?(\S+)\s*$/i);
  if (!match) return null;
  return { 
    command: 'kick', 
    targetUser: match[2] 
  };
};

export const validatePermission = (params, user) => {
  if (!isAdmin(user?.role)) {
    return { error: '喵呜~ 这个命令需要管理员权限哦' };
  }
  return null;
};

export const requiresPermission = () => true;
