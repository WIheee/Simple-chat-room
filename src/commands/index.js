/**
 * 命令系统
 * 支持可扩展的命令注册和解析
 */

// 导入所有命令模块
import * as whisperCommand from './whisper.js';
import * as opCommand from './op.js';
import * as deopCommand from './deop.js';
import * as listCommand from './list.js';
import * as kickCommand from './kick.js';
import * as helpCommand from './help.js';
import * as regCommand from './reg.js';
import * as muteCommand from './mute.js';

// 导出权限相关
export * from './permissions.js';

/**
 * 注册的命令列表
 * 新命令可以在这里添加
 */
const registeredCommands = [
  whisperCommand,
  opCommand,
  deopCommand,
  listCommand,
  kickCommand,
  helpCommand,
  regCommand,
  muteCommand
];

/**
 * 命令映射表（按名称和别名索引）
 */
const commandMap = new Map();

// 初始化命令映射
registeredCommands.forEach(cmd => {
  // 注册主命令名
  if (cmd.name) {
    commandMap.set(cmd.name.toLowerCase(), cmd);
  }
  // 注册别名
  if (cmd.aliases && Array.isArray(cmd.aliases)) {
    cmd.aliases.forEach(alias => {
      commandMap.set(alias.toLowerCase(), cmd);
    });
  }
});

/**
 * 解析命令
 * @param {string} text - 输入文本
 * @returns {Object|null} 解析结果或 null
 * 
 * 返回格式:
 * - 成功: { command: string, targetUser?: string, content?: string, ... }
 * - 错误: { error: string }
 * - 非命令: null
 */
export const parseCommand = (text) => {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();

  // 检查是否以 / 开头
  if (!trimmed.startsWith('/')) return null;

  // 提取命令名称
  const parts = trimmed.split(/\s+/);
  if (parts.length === 0) return null;

  const commandPart = parts[0].substring(1).toLowerCase(); // 去掉 /

  // 查找命令
  const command = commandMap.get(commandPart);
  if (!command) {
    return { error: `未知命令: /${commandPart}` };
  }

  // 使用命令自己的解析器
  if (command.parse) {
    return command.parse(trimmed);
  }

  // 默认解析逻辑
  return {
    command: command.name,
    raw: trimmed
  };
};

/**
 * 验证命令执行权限
 * @param {Object} parsedCommand - 解析后的命令对象
 * @param {Object} user - 当前用户信息
 * @returns {Object|null} 验证结果，null 表示验证通过
 */
export const validateCommandPermission = (parsedCommand, user) => {
  if (!parsedCommand || !parsedCommand.command) return null;

  const command = commandMap.get(parsedCommand.command);
  if (!command) return null;

  // 如果命令有自定义权限验证
  if (command.validatePermission) {
    return command.validatePermission(parsedCommand, user);
  }

  // 如果命令需要权限检查
  if (command.requiredPermission && user) {
    const { hasPermission } = require('./permissions.js');
    if (!hasPermission(user.role, command.requiredPermission)) {
      return { error: '你没有权限执行此命令' };
    }
  }

  return null;
};

/**
 * 检查用户是否有权限查看消息
 * @param {Object} message - 消息对象
 * @param {string} currentUsername - 当前用户名
 * @returns {boolean} 是否有权限查看
 */
export const canViewMessage = (message, currentUsername) => {
  // 如果不是私聊消息，所有人可见
  if (!message.isWhisper) return true;

  // 发送者和接收者可见
  const isSender = message.username === currentUsername;
  const isTarget = message.targetUser === currentUsername;

  return isSender || isTarget;
};

/**
 * 获取所有注册的命令列表
 * @param {Object} user - 当前用户（可选，用于过滤有权限的命令）
 * @returns {Array} 命令列表
 */
export const getCommandList = (user) => {
  return registeredCommands
    .filter(cmd => {
      // 过滤掉没有权限的命令
      if (cmd.requiredPermission && user) {
        const { hasPermission } = require('./permissions.js');
        return hasPermission(user.role, cmd.requiredPermission);
      }
      return true;
    })
    .map(cmd => ({
      name: cmd.name,
      aliases: cmd.aliases || [],
      description: cmd.description || '',
      usage: cmd.usage || '',
      requiresPermission: cmd.requiresPermission ? cmd.requiresPermission() : false
    }));
};

/**
 * 检查文本是否是命令
 * @param {string} text - 输入文本
 * @returns {boolean} 是否是命令
 */
export const isCommand = (text) => {
  if (!text || typeof text !== 'string') return false;
  return text.trim().startsWith('/');
};

/**
 * 获取命令帮助信息
 * @param {string} commandName - 命令名称（可选）
 * @returns {string} 帮助信息
 */
export const getHelp = (commandName) => {
  if (commandName) {
    const cmd = commandMap.get(commandName.toLowerCase());
    if (cmd) {
      return `${cmd.usage || cmd.name}\n  ${cmd.description || '无描述'}`;
    }
    return `未找到命令: ${commandName}`;
  }

  // 返回所有命令帮助
  const helpLines = registeredCommands.map(cmd => {
    const aliases = cmd.aliases && cmd.aliases.length > 0 
      ? ` (${cmd.aliases.join(', ')})` 
      : '';
    const permFlag = cmd.requiresPermission && cmd.requiresPermission() ? ' [需要权限]' : '';
    return `/${cmd.name}${aliases}${permFlag} - ${cmd.description || '无描述'}`;
  });

  return `可用命令:\n${helpLines.join('\n')}`;
};

// 导出命令模块供直接访问
export { whisperCommand, opCommand, deopCommand };