/**
 * API 请求工具
 */

/**
 * 获取当前用户名
 * @returns {string} 用户名
 */
const getCurrentUsername = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).username : '';
  } catch (e) {
    return '';
  }
};

/**
 * 发送 API 请求
 * @param {string} path - API 路径
 * @param {Object} options - 请求选项
 * @param {number} timeout - 超时时间（毫秒），默认 10 秒
 * @returns {Promise<Object>} 响应数据
 */
export const apiRequest = async (path, options = {}, timeout = 10000) => {
  const username = getCurrentUsername();
  
  // 将用户名添加到 URL 参数或 body 中
  let url = `api.php?path=${path}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };

  // GET 请求通过 URL 参数传递用户名
  const method = (options.method || 'GET').toUpperCase();
  if (method === 'GET' && username) {
    url += `&username=${encodeURIComponent(username)}`;
  }
  
  // 其他请求通过 body 传递用户名
  if (options.body && username) {
    config.body = JSON.stringify({
      ...options.body,
      _currentUser: username
    });
  } else if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  // 创建超时控制器
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  config.signal = controller.signal;

  try {
    const res = await fetch(url, config);
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      return { success: false, message: `服务器错误: HTTP ${res.status}` };
    }
    
    const data = await res.json();
    return data;
  } catch (e) {
    clearTimeout(timeoutId);
    
    if (e.name === 'AbortError') {
      return { success: false, message: '请求超时，请检查网络连接' };
    }
    
    return { success: false, message: `网络错误: ${e.message}` };
  }
};

/**
 * 获取认证 Token
 * @returns {string|null} Token
 */
export const getToken = () => {
  return localStorage.getItem('token') || '';
};

/**
 * 设置认证 Token
 * @param {string} token - Token
 */
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

/**
 * 移除认证 Token
 */
export const removeToken = () => {
  localStorage.removeItem('token');
};

/**
 * 获取用户信息
 * @returns {Object|null} 用户信息
 */
export const getUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (e) {
    console.error('解析用户信息失败:', e);
    return null;
  }
};

/**
 * 设置用户信息
 * @param {Object} user - 用户信息
 */
export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

/**
 * 移除用户信息
 */
export const removeUser = () => {
  localStorage.removeItem('user');
};

/**
 * 设置用户角色（需要管理员权限）
 * @param {string} username - 目标用户名
 * @param {string} role - 角色名称 (admin/user)
 * @returns {Promise<Object>} 响应数据
 */
export const setUserRole = async (username, role) => {
  return await apiRequest('users/role', {
    method: 'POST',
    body: { username, role }
  });
};

/**
 * 获取所有用户列表（需要管理员权限）
 * @returns {Promise<Object>} 响应数据
 */
export const getUsers = async () => {
  return await apiRequest('users');
};

/**
 * 管理员注册用户（需要管理员权限）
 * @param {string} email - 邮箱
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @param {string} role - 角色 (admin/user)
 * @returns {Promise<Object>} 响应数据
 */
export const adminRegister = async (email, username, password, role) => {
  return await apiRequest('admin/register', {
    method: 'POST',
    body: { email, username, password, role }
  });
};

/**
 * 禁言用户（需要管理员权限）
 * @param {string} username - 目标用户名
 * @param {number} duration - 禁言时长（秒），-1 表示永久
 * @returns {Promise<Object>} 响应数据
 */
export const muteUser = async (username, duration) => {
  return await apiRequest('mute/add', {
    method: 'POST',
    body: { username, duration }
  });
};

/**
 * 解除禁言（需要管理员权限）
 * @param {string} username - 目标用户名
 * @returns {Promise<Object>} 响应数据
 */
export const unmuteUser = async (username) => {
  return await apiRequest('mute/remove', {
    method: 'POST',
    body: { username }
  });
};

/**
 * 获取禁言用户列表（需要管理员权限）
 * @returns {Promise<Object>} 响应数据
 */
export const getMuteList = async () => {
  return await apiRequest('mute/list');
};

/**
 * 检查当前用户是否被禁言
 * @returns {Promise<Object>} 响应数据
 */
export const checkMuted = async () => {
  return await apiRequest('mute/check');
};

/**
 * 删除用户（需要管理员权限）
 * @param {string} username - 目标用户名
 * @returns {Promise<Object>} 响应数据
 */
export const deleteUser = async (username) => {
  return await apiRequest('users/delete', {
    method: 'DELETE',
    body: { username }
  });
};

/**
 * 检查当前用户是否被踢出
 * @returns {Promise<Object>} 响应数据
 */
export const checkKicked = async () => {
  return await apiRequest('auth/check_kicked');
};