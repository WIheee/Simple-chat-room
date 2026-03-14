/**
 * 私聊命令 (whisper)
 * 格式: /w @username 消息内容
 */

/**
 * 命令名称
 */
export const name = 'w';

/**
 * 命令别名
 */
export const aliases = ['whisper', 'pm', 'msg'];

/**
 * 命令描述
 */
export const description = '发送私聊消息给指定用户';

/**
 * 命令用法
 */
export const usage = '/w @username 消息内容';

/**
 * 解析私聊命令
 * @param {string} text - 输入文本
 * @returns {Object|null} 解析结果 { command: 'w', targetUser: string, content: string } 或错误对象
 */
export const parse = (text) => {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();

  // 解析命令格式: /w @target message
  const commandRegex = /^\/(\w+)\s+@(\S+)\s*(.*)$/;
  const match = trimmed.match(commandRegex);

  if (!match) return null;

  const [, command, targetUser, content] = match;

  // 检查是否是 whisper 命令或其别名
  const cmd = command.toLowerCase();
  if (cmd !== 'w' && cmd !== 'whisper' && cmd !== 'pm' && cmd !== 'msg') {
    return null;
  }

  // 验证目标用户名不为空
  if (!targetUser) {
    return { error: '请指定要私聊的用户' };
  }

  // 验证消息内容不为空
  if (!content || content.trim() === '') {
    return { error: '请输入消息内容' };
  }

  return {
    command: 'w',
    targetUser: targetUser,
    content: content.trim()
  };
};

/**
 * 验证命令参数
 * @param {Object} params - 命令参数
 * @returns {Object|null} 验证结果，null 表示验证通过
 */
export const validate = (params) => {
  if (!params.targetUser) {
    return { error: '请指定要私聊的用户' };
  }
  if (!params.content || params.content.trim() === '') {
    return { error: '请输入消息内容' };
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
  // 私聊命令不需要管理员权限，所有登录用户都可以使用
  return null;
};

/**
 * 检查命令是否需要权限
 * @returns {boolean}
 */
export const requiresPermission = () => {
  return false;
};

/**
 * 构建消息对象
 * @param {string} content - 消息内容
 * @param {string} targetUser - 目标用户
 * @param {string} username - 发送者用户名
 * @returns {Object} 消息对象
 */
export const buildMessage = (content, targetUser, username) => {
  const clientTimestamp = Date.now();
  const stableId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  return {
    id: 'temp_' + stableId,
    stableId: stableId,
    username: username,
    content: content,
    created_at: clientTimestamp,
    author: { username: username },
    isWhisper: true,
    targetUser: targetUser
  };
};
