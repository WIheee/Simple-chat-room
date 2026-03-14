/**
 * 工具函数集合
 */

// 导入 marked 用于 Markdown 解析
import { marked } from 'marked';

// 配置 marked 库
marked.setOptions({
  breaks: true,     // 将单个换行符转换为 <br>
  gfm: true,        // 启用 GitHub Flavored Markdown
  headerIds: true,  // 启用标题 ID
  mangle: false,    // 禁用标题转义
});

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export const debounce = (fn, delay) => {
  let timeoutId = null;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * 节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export const throttle = (fn, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};

/**
 * HTML 转义
 * @param {string} unsafe - 不安全的字符串
 * @returns {string} 转义后的安全字符串
 */
export const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return unsafe.replace(/[&<>"']/g, m => {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    return '&#039;';
  });
};

/**
 * 格式化时间
 * @param {number} ts - 时间戳（秒或毫秒）
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (ts) => {
  if (!ts) return '';
  // 处理 Unix 时间戳：如果是秒级（小于 10000000000），转换为毫秒
  const timestamp = ts < 10000000000 ? ts * 1000 : ts;
  const d = new Date(timestamp);

  // 12小时制
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 小时为0时显示12

  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes} ${ampm}`;
};

/**
 * 获取头像字符
 * @param {string} username - 用户名
 * @returns {string} 头像字符
 */
export const getAvatarChar = (username) => {
  return (username || '用户').charAt(0).toUpperCase();
};

/**
 * 解析 Markdown 和 @提及
 * @param {string} text - 消息文本
 * @returns {string} 带有 Markdown 格式和 @提及 HTML 的文本
 */
export const parseMentions = (text) => {
  if (!text) return '';

  // 先转义 HTML（防止 XSS）
  const escaped = text.replace(/[&<>"']/g, m => {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    return '&#039;';
  });

  // 解析 Markdown
  const markdown = marked.parse(escaped);

  // 处理 @提及（在代码块内的不处理）
  // 使用更精确的正则，避免在代码块内匹配
  let result = markdown.replace(/(?<!<code[^>]*>|<pre[^>]*>)@(\w+)/g, '<span class="mention">@$1</span>');

  return result;
};

/**
 * 检测消息中是否提及了当前用户
 * @param {string} messageContent - 消息内容
 * @param {string} username - 用户名
 * @returns {boolean} 是否提及了用户
 */
export const isUserMentioned = (messageContent, username) => {
  if (!username || !messageContent) return false;
  const mentionPattern = new RegExp(`@${username}(\\s|$)`, 'i');
  return mentionPattern.test(messageContent);
};

/**
 * 查找@提及的起始位置
 * @param {string} text - 输入文本
 * @param {number} cursorPos - 光标位置
 * @returns {number} @符号的位置，如果没有则返回-1
 */
export const findMentionStart = (text, cursorPos) => {
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (text[i] === '@') {
      if (i === cursorPos - 1) return -1;
      return i;
    }
    if (text[i] === ' ' || text[i] === '\n') {
      return -1;
    }
  }
  return -1;
};
