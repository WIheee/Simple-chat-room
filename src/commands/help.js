/**
 * 帮助命令
 */

export const name = 'help';
export const description = '显示所有可用命令';
export const usage = '/help';
export const aliases = ['?', 'h'];

export const parse = (text) => {
  const match = text.match(/^\/(help|\?|h)\s*$/i);
  if (!match) return null;
  return { command: 'help' };
};

/**
 * 验证命令执行权限
 * @param {Object} params - 命令参数
 * @param {Object} user - 当前用户信息
 * @returns {Object|null} 验证结果，null 表示验证通过
 */
export const validatePermission = (params, user) => {
  // 帮助命令不需要权限，所有用户都可以使用
  return null;
};

export const requiresPermission = () => false;
