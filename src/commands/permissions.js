/**
 * 权限系统
 */

/**
 * 用户角色枚举
 */
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

/**
 * 角色权限映射
 */
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    canOp: true,           // 可以授予管理员权限
    canDeop: true,         // 可以移除管理员权限
    canKick: true,         // 可以踢出用户
    canBan: true,          // 可以封禁用户
    canMute: true,         // 可以禁言用户
    canManageChannels: true, // 可以管理频道
    canDeleteMessages: true // 可以删除消息
  },
  [ROLES.USER]: {
    canOp: false,
    canDeop: false,
    canKick: false,
    canBan: false,
    canMute: false,
    canManageChannels: false,
    canDeleteMessages: false
  }
};

/**
 * 检查用户是否有指定权限
 * @param {string} role - 用户角色
 * @param {string} permission - 权限名称
 * @returns {boolean} 是否有权限
 */
export const hasPermission = (role, permission) => {
  const rolePermissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.USER];
  return !!rolePermissions[permission];
};

/**
 * 检查用户是否是管理员
 * @param {string} role - 用户角色
 * @returns {boolean} 是否是管理员
 */
export const isAdmin = (role) => {
  return role === ROLES.ADMIN;
};

/**
 * 获取角色显示名称
 * @param {string} role - 角色标识
 * @returns {string} 显示名称
 */
export const getRoleDisplayName = (role) => {
  const names = {
    [ROLES.ADMIN]: '管理员',
    [ROLES.USER]: '用户'
  };
  return names[role] || '用户';
};

/**
 * 获取角色颜色
 * @param {string} role - 角色标识
 * @returns {string} 颜色值
 */
export const getRoleColor = (role) => {
  const colors = {
    [ROLES.ADMIN]: '#E91E63',
    [ROLES.USER]: '#949BA4'
  };
  return colors[role] || '#949BA4';
};
