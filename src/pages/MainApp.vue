<template>
  <div class="main-app">
    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="header__left">
        <!-- 移动端侧边栏切换按钮 -->
        <button
          @click="showSidebar = true"
          class="sidebar-toggle"
        >
          <i data-lucide="menu" class="w-5 h-5"></i>
        </button>
        <div class="header__title">
          <i data-lucide="message-circle" class="w-5 h-5 text-[#5865F2]"></i>
          <span>Discord</span>
        </div>
      </div>
      <div class="header__right">
        <span v-if="isAdmin(user?.role)" class="admin-badge">
          <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          管理员
        </span>
        <span :class="['header__username', { 'admin-name': isAdmin(user?.role) }]">{{ user?.username }}</span>
        <button @click="logout" class="logout-btn">
          <i data-lucide="log-out" class="w-5 h-5"></i>
        </button>
      </div>
    </header>

    <div class="main-content">
      <!-- 侧边栏遮罩层（移动端） -->
      <transition name="fade">
        <div
          v-if="showSidebar"
          @click="showSidebar = false"
          class="sidebar-overlay"
        ></div>
      </transition>

      <!-- 左侧侧边栏 -->
      <aside
        :class="['sidebar', { open: showSidebar }]"
      >
        <ChannelList
          :channels="channels"
          :current-channel="currentChannel"
          @select="handleSelectChannel"
        />
        <OnlineUsers
          :online-users="onlineUsers"
          :current-user="user?.username"
        />
        <!-- 移动端关闭按钮 -->
        <button
          @click="showSidebar = false"
          class="sidebar-close"
        >
          <i data-lucide="x" class="w-5 h-5 mx-auto"></i>
        </button>
      </aside>

      <!-- 右侧聊天区域 -->
      <main class="chat-area">
        <!-- 频道标题 -->
        <div class="chat-header">
          <i data-lucide="hash" class="w-5 h-5 text-[#949BA4] mr-2"></i>
          <span class="chat-header__title">{{ currentChannelName }}</span>
        </div>

        <!-- 消息列表 -->
        <div class="message-list" ref="messageListRef">
          <div v-if="currentMessages.length === 0" class="empty-state">
            暂无消息，开始聊天吧！
          </div>
          <div v-else class="messages-container">
            <MessageItem
              v-for="msg in currentMessages"
              :key="msg.stableId || msg.id"
              :message="msg"
              :current-user="user?.username"
              :user-role="userRolesMap[msg.username] || 'user'"
              @mention="handleMention"
            />
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <div class="input-wrapper">
            <textarea
              v-model="messageText"
              rows="1"
              class="message-input"
              placeholder="输入消息..."
              @keydown.enter="handleKeyDown"
              @keydown.tab="handleMentionKeydown"
              @keydown.down="handleMentionKeydown"
              @keydown.up="handleMentionKeydown"
              @keydown.esc="handleMentionKeydown"
              @input="handleMentionInput"
            ></textarea>
            <button
              @click="sendMessage"
              class="send-btn"
            >
              <i data-lucide="send" class="w-5 h-5 text-white"></i>
            </button>
          </div>

          <!-- @提及建议列表 -->
          <MentionSuggestions
            :show="showMentionSuggestions"
            :suggestions="mentionSuggestions"
            :search-term="mentionSearchTerm"
            :selected-index="mentionSelectedIndex"
            @select="selectMentionSuggestion"
          />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import ChannelList from '../components/ChannelList.vue';
import OnlineUsers from '../components/OnlineUsers.vue';
import MessageItem from '../components/MessageItem.vue';
import MentionSuggestions from '../components/MentionSuggestions.vue';
import { apiRequest, getToken, getUser, removeToken, removeUser, setUserRole, checkKicked, adminRegister, muteUser, unmuteUser, getMuteList, checkMuted } from '../utils/api';
import {
  debounce,
  findMentionStart
} from '../utils/helpers';
import { parseCommand, validateCommandPermission, isAdmin } from '../commands';
import {
  recordMetric,
  recordApiRequest,
  recordCacheHit,
  recordCacheMiss,
  startPerformanceMonitoring
} from '../utils/performance';

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['logout']);

// 状态
const currentChannel = ref('1');
const channels = ref([]);
const messages = ref({});
const onlineUsers = ref([]);
const lastMessageId = ref('');
const showSidebar = ref(false);
const messageText = ref('');
const messageListRef = ref(null);

// 长轮询优化变量
const longPollingAbortController = ref(null);
const longPollRetryCount = ref(0);
const longPollRetryDelay = ref(100);
const maxRetryDelay = 5000;
const maxRetryCount = 10;
const isLongPolling = ref(false);
const isOnline = ref(navigator.onLine);
const isPageVisible = ref(!document.hidden);

// @提及功能
const mentionSuggestions = ref([]);
const mentionSearchTerm = ref('');
const mentionSelectedIndex = ref(0);
const showMentionSuggestions = ref(false);
const mentionInputPos = ref(0);

// 性能优化变量
const maxMessagesVisible = ref(100);

// 缓存相关
const cachedUserList = ref([]);
const lastUserListUpdate = ref(0);
const USER_LIST_CACHE_TTL = 30000; // 用户列表缓存 30 秒

// 图标更新优化
let iconUpdateTimeout = null;
let shouldUpdateIcons = false;

// 计算属性
const currentMessages = computed(() => {
  // 虚拟滚动可以处理大量消息，不再需要限制数量
  return messages.value[currentChannel.value] || [];
});

const currentChannelName = computed(() =>
  channels.value.find(c => c.id === currentChannel.value)?.name || ''
);

// 用户名到角色的映射
const userRolesMap = computed(() => {
  const map = {};
  // 从在线用户获取角色
  onlineUsers.value.forEach(u => {
    map[u.username] = u.role || 'user';
  });
  // 当前用户的角色
  if (props.user?.username) {
    map[props.user.username] = props.user.role || 'user';
  }
  return map;
});

// 防抖的图标更新函数
const debouncedUpdateIcons = debounce(() => {
  if (shouldUpdateIcons) {
    lucide.createIcons();
    shouldUpdateIcons = false;
  }
}, 100);

// 触发图标更新（防抖）
const triggerIconUpdate = () => {
  shouldUpdateIcons = true;
  debouncedUpdateIcons();
};

// 获取缓存的用户列表
const getCachedUserList = () => {
  const now = Date.now();
  if (now - lastUserListUpdate.value > USER_LIST_CACHE_TTL) {
    // 缓存过期，重新计算
    recordCacheMiss();
    const allMessages = Object.values(messages.value).flat();
    cachedUserList.value = [...new Set([
      ...onlineUsers.value.map(u => u.username),
      ...allMessages.map(m => m.username),
      props.user?.username
    ].filter(Boolean))];
    lastUserListUpdate.value = now;
  } else {
    recordCacheHit();
  }
  recordMetric('mentionCalculationCount');
  return cachedUserList.value;
};

// API 请求
const loadChannels = async () => {
  const startTime = Date.now();
  const data = await apiRequest('channels');
  recordApiRequest(startTime);
  if (data.success) {
    channels.value = data.data;
  }
};

const loadMessages = async (channelId) => {
  const startTime = Date.now();
  const data = await apiRequest(`channels/${channelId}/messages`);
  recordApiRequest(startTime);

  if (data.success) {
    messages.value[channelId] = data.data || [];
    const msgs = messages.value[channelId];
    if (msgs.length > 0) {
      lastMessageId.value = msgs[msgs.length - 1].id;
    }
    // 延迟滚动，确保消息完全渲染
    setTimeout(() => scrollToBottom(), 100);
    // 只在消息数量较多时记录
    if (msgs.length > 10) {
      recordMetric('messageRenderCount', msgs.length);
    }
  }
};

const handleSelectChannel = async (id) => {
  if (currentChannel.value === id) return;
  currentChannel.value = id;

  if (messages.value[id] && messages.value[id].length > 0) {
    const msgs = messages.value[id];
    lastMessageId.value = msgs[msgs.length - 1].id;
    scrollToBottom();
  } else {
    lastMessageId.value = '';
    await loadMessages(id);
  }

  if (window.innerWidth <= 640) {
    showSidebar.value = false;
  }
  triggerIconUpdate();
};

const handleKeyDown = (event) => {
  // Enter 键不阻止默认行为，允许换行
  // 发送消息只能通过点击按钮
};

const sendMessage = async () => {
  if (!currentChannel.value) return alert('请选择频道');

  const content = messageText.value;
  if (!content || content.trim() === '') return;

  showMentionSuggestions.value = false;
  mentionSuggestions.value = [];

  // 检查是否被禁言
  const muteResult = await checkMuted();
  if (muteResult.success && muteResult.data?.muted) {
    const unmuteTime = muteResult.data.unmute_time;
    let timeText = '永久';
    if (unmuteTime !== -1) {
      timeText = new Date(unmuteTime * 1000).toLocaleString('zh-CN');
    }
    alert(`喵呜~ 你被禁言了呢...\n解除时间: ${timeText}\n\n要联系管理员才能提前解除哦~`);
    return;
  }

  // 解析命令
  const commandResult = parseCommand(content);

  // 如果是命令但解析出错
  if (commandResult && commandResult.error) {
    alert(commandResult.error);
    return;
  }

  // 统一权限验证
  if (commandResult) {
    const permissionError = validateCommandPermission(commandResult, props.user);
    if (permissionError) {
      alert(permissionError.error);
      return;
    }
  }

  // 处理 op 命令（设置管理员权限）
  if (commandResult && commandResult.command === 'op') {

    const targetUser = commandResult.targetUser;
    
    // 乐观更新：立即显示处理中状态
    const stableId = 'sys_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const tempMsg = {
      id: 'temp_sys_' + Date.now(),
      stableId: stableId,
      username: '猫娘助手',
      content: `喵~ 正在给 @${targetUser} 授予管理员权限喵...`,
      created_at: Date.now(),
      author: { username: '猫娘助手' },
      isSystem: true,
      isPending: true
    };
    
    if (!messages.value[currentChannel.value]) {
      messages.value[currentChannel.value] = [];
    }
    messages.value[currentChannel.value].push(tempMsg);
    messageText.value = '';
    scrollToBottom();
    
    const result = await setUserRole(targetUser, 'admin');
    
    // 更新消息显示最终结果
    const msgIndex = messages.value[currentChannel.value].findIndex(m => m.stableId === stableId);
    if (msgIndex !== -1) {
      messages.value[currentChannel.value][msgIndex] = {
        ...messages.value[currentChannel.value][msgIndex],
        id: 'sys_' + Date.now(),
        content: result.success 
          ? `喵呜~ @${targetUser} 现在是管理员啦，要好好管理哦~`
          : `喵...失败了: ${result.message || '未知错误'}`,
        isPending: false,
        isError: !result.success
      };
    }
    scrollToBottom();
    return;
  }

  // 处理 deop 命令（取消管理员权限）
  if (commandResult && commandResult.command === 'deop') {
    const targetUser = commandResult.targetUser;
    
    // 乐观更新
    const stableId = 'sys_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const tempMsg = {
      id: 'temp_sys_' + Date.now(),
      stableId: stableId,
      username: '猫娘助手',
      content: `喵~ 正在取消 @${targetUser} 的管理员权限...`,
      created_at: Date.now(),
      author: { username: '猫娘助手' },
      isSystem: true,
      isPending: true
    };
    
    if (!messages.value[currentChannel.value]) {
      messages.value[currentChannel.value] = [];
    }
    messages.value[currentChannel.value].push(tempMsg);
    messageText.value = '';
    scrollToBottom();
    
    const result = await setUserRole(targetUser, 'user');
    
    const msgIndex = messages.value[currentChannel.value].findIndex(m => m.stableId === stableId);
    if (msgIndex !== -1) {
      messages.value[currentChannel.value][msgIndex] = {
        ...messages.value[currentChannel.value][msgIndex],
        id: 'sys_' + Date.now(),
        content: result.success 
          ? `喵~ @${targetUser} 不再是管理员啦，变回普通用户了呢`
          : `喵...失败了: ${result.message || '未知错误'}`,
        isPending: false,
        isError: !result.success
      };
    }
    scrollToBottom();
    return;
  }

  // 处理 reg 命令（管理员注册用户）
  if (commandResult && commandResult.command === 'reg') {
    const { email, username, password, role } = commandResult;
    
    // 乐观更新
    const stableId = 'sys_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const tempMsg = {
      id: 'temp_sys_' + Date.now(),
      stableId: stableId,
      username: '猫娘助手',
      content: `喵~ 正在帮 @${username} 注册账号呢...`,
      created_at: Date.now(),
      author: { username: '猫娘助手' },
      isSystem: true,
      isPending: true
    };
    
    if (!messages.value[currentChannel.value]) {
      messages.value[currentChannel.value] = [];
    }
    messages.value[currentChannel.value].push(tempMsg);
    messageText.value = '';
    scrollToBottom();
    
    const result = await adminRegister(email, username, password, role);
    
    const msgIndex = messages.value[currentChannel.value].findIndex(m => m.stableId === stableId);
    if (msgIndex !== -1) {
      messages.value[currentChannel.value][msgIndex] = {
        ...messages.value[currentChannel.value][msgIndex],
        id: 'sys_' + Date.now(),
        content: result.success 
          ? `喵呜~ @${username} 注册成功啦，是${role === 'admin' ? '管理员' : '普通用户'}哦`
          : `喵...失败了: ${result.message || '未知错误'}`,
        isPending: false,
        isError: !result.success
      };
    }
    scrollToBottom();
    return;
  }

  // 处理 mute 命令（禁言）
  if (commandResult && commandResult.command === 'mute') {
    const { action, targetUser, duration, durationDisplay } = commandResult;
    
    // 子命令: list - 列出被禁言用户
    if (action === 'list') {
      const stableId = 'sys_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const tempMsg = {
        id: 'temp_sys_' + Date.now(),
        stableId: stableId,
        username: '猫娘助手',
        content: `喵~ 正在查看禁言小本本...`,
        created_at: Date.now(),
        author: { username: '猫娘助手' },
        isSystem: true,
        isPending: true
      };
      
      if (!messages.value[currentChannel.value]) {
        messages.value[currentChannel.value] = [];
      }
      messages.value[currentChannel.value].push(tempMsg);
      messageText.value = '';
      scrollToBottom();
      
      const result = await getMuteList();
      
      const msgIndex = messages.value[currentChannel.value].findIndex(m => m.stableId === stableId);
      if (msgIndex !== -1) {
        if (result.success && result.data) {
          if (result.data.length === 0) {
            messages.value[currentChannel.value][msgIndex] = {
              ...messages.value[currentChannel.value][msgIndex],
              id: 'sys_' + Date.now(),
              content: `**禁言列表** 暂时没有人被禁言呢，大家都很乖~`,
              isPending: false
            };
          } else {
            const muteList = result.data.map(m => {
              const unmuteTime = m.unmute_time === -1 
                ? '永久' 
                : new Date(m.unmute_time * 1000).toLocaleString('zh-CN');
              return `• @${m.username} - 解除时间: ${unmuteTime}`;
            }).join('\n');
            
            messages.value[currentChannel.value][msgIndex] = {
              ...messages.value[currentChannel.value][msgIndex],
              id: 'sys_' + Date.now(),
              content: `**禁言小本本** (${result.data.length} 只小猫咪被禁言)\n${muteList}`,
              isPending: false
            };
          }
        } else {
          messages.value[currentChannel.value][msgIndex] = {
            ...messages.value[currentChannel.value][msgIndex],
            id: 'sys_' + Date.now(),
            content: `喵...查不到: ${result.message || '未知错误'}`,
            isPending: false,
            isError: true
          };
        }
      }
      scrollToBottom();
      return;
    }
    
    // 子命令: rem - 解除禁言
    if (action === 'rem') {
      const stableId = 'sys_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const tempMsg = {
        id: 'temp_sys_' + Date.now(),
        stableId: stableId,
        username: '猫娘助手',
        content: `喵~ 正在解禁 @${targetUser}...`,
        created_at: Date.now(),
        author: { username: '猫娘助手' },
        isSystem: true,
        isPending: true
      };
      
      if (!messages.value[currentChannel.value]) {
        messages.value[currentChannel.value] = [];
      }
      messages.value[currentChannel.value].push(tempMsg);
      messageText.value = '';
      scrollToBottom();
      
      const result = await unmuteUser(targetUser);
      
      const msgIndex = messages.value[currentChannel.value].findIndex(m => m.stableId === stableId);
      if (msgIndex !== -1) {
        messages.value[currentChannel.value][msgIndex] = {
          ...messages.value[currentChannel.value][msgIndex],
          id: 'sys_' + Date.now(),
          content: result.success 
            ? `喵呜~ @${targetUser} 被解禁啦，可以说话了哦，要乖呢~`
            : `喵...失败了: ${result.message || '未知错误'}`,
          isPending: false,
          isError: !result.success
        };
      }
      scrollToBottom();
      return;
    }
    
    // 主命令: 禁言用户
    if (action === 'mute') {
      const stableId = 'sys_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const tempMsg = {
        id: 'temp_sys_' + Date.now(),
        stableId: stableId,
        username: '猫娘助手',
        content: `喵~ 正在让 @${targetUser} 安静一下...`,
        created_at: Date.now(),
        author: { username: '猫娘助手' },
        isSystem: true,
        isPending: true
      };
      
      if (!messages.value[currentChannel.value]) {
        messages.value[currentChannel.value] = [];
      }
      messages.value[currentChannel.value].push(tempMsg);
      messageText.value = '';
      scrollToBottom();
      
      const result = await muteUser(targetUser, duration);
      
      const msgIndex = messages.value[currentChannel.value].findIndex(m => m.stableId === stableId);
      if (msgIndex !== -1) {
        messages.value[currentChannel.value][msgIndex] = {
          ...messages.value[currentChannel.value][msgIndex],
          id: 'sys_' + Date.now(),
          content: result.success 
            ? `喵呜~ @${targetUser} 被禁言啦，时长: ${durationDisplay}，要安静一下哦~`
            : `喵...失败了: ${result.message || '未知错误'}`,
          isPending: false,
          isError: !result.success
        };
      }
      scrollToBottom();
      return;
    }
    return;
  }

  // 处理 list 命令（列出所有用户）
  if (commandResult && commandResult.command === 'list') {
    // 乐观更新
    const stableId = 'sys_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const tempMsg = {
      id: 'temp_sys_' + Date.now(),
      stableId: stableId,
      username: '猫娘助手',
      content: `喵~ 正在数有多少小伙伴...`,
      created_at: Date.now(),
      author: { username: '猫娘助手' },
      isSystem: true,
      isPending: true
    };
    
    if (!messages.value[currentChannel.value]) {
      messages.value[currentChannel.value] = [];
    }
    messages.value[currentChannel.value].push(tempMsg);
    messageText.value = '';
    scrollToBottom();
    
    const { getUsers } = await import('../utils/api');
    const result = await getUsers();
    
    const msgIndex = messages.value[currentChannel.value].findIndex(m => m.stableId === stableId);
    if (msgIndex !== -1) {
      if (result.success && result.data) {
        const userList = result.data
          .map((u, i) => `${i + 1}. ${u.username} (${u.role === 'admin' ? '管理员' : '用户'})`)
          .join('\n');
        
        messages.value[currentChannel.value][msgIndex] = {
          ...messages.value[currentChannel.value][msgIndex],
          id: 'sys_' + Date.now(),
          content: `**小伙伴名单** (${result.data.length} 只) 喵~\n\`\`\`\n${userList}\n\`\`\``,
          isPending: false
        };
      } else {
        messages.value[currentChannel.value][msgIndex] = {
          ...messages.value[currentChannel.value][msgIndex],
          id: 'sys_' + Date.now(),
          content: `喵...数不出来: ${result.message || '未知错误'}`,
          isPending: false,
          isError: true
        };
      }
    }
    scrollToBottom();
    return;
  }

  // 处理 kick 命令（删除用户）
  if (commandResult && commandResult.command === 'kick') {
    const targetUser = commandResult.targetUser;
    
    // 防止删除自己
    if (targetUser === props.user?.username) {
      alert('喵？不可以删除自己哦，会消失的喵~');
      return;
    }
    
    // 乐观更新
    const stableId = 'sys_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const tempMsg = {
      id: 'temp_sys_' + Date.now(),
      stableId: stableId,
      username: '猫娘助手',
      content: `喵~ 正在送走 @${targetUser}...`,
      created_at: Date.now(),
      author: { username: '猫娘助手' },
      isSystem: true,
      isPending: true
    };
    
    if (!messages.value[currentChannel.value]) {
      messages.value[currentChannel.value] = [];
    }
    messages.value[currentChannel.value].push(tempMsg);
    messageText.value = '';
    scrollToBottom();
    
    const { deleteUser } = await import('../utils/api');
    const result = await deleteUser(targetUser);
    
    const msgIndex = messages.value[currentChannel.value].findIndex(m => m.stableId === stableId);
    if (msgIndex !== -1) {
      messages.value[currentChannel.value][msgIndex] = {
        ...messages.value[currentChannel.value][msgIndex],
        id: 'sys_' + Date.now(),
        content: result.success 
          ? `喵呜~ @${targetUser} 已经离开啦，希望他/她会想念我们呢...`
          : `喵...送不走: ${result.message || '未知错误'}`,
        isPending: false,
        isError: !result.success
      };
    }
    scrollToBottom();
    return;
  }

  // 处理 help 命令（显示帮助）
  if (commandResult && commandResult.command === 'help') {
    // 乐观更新：先显示临时系统消息
    const stableId = 'sys_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const tempSysMsg = {
      id: 'temp_sys_' + Date.now(),
      stableId: stableId,
      username: '猫娘助手',
      content: '喵~ 正在翻说明书...',
      created_at: Date.now(),
      author: { username: '猫娘助手' },
      isSystem: true,
      isPending: true
    };
    
    if (!messages.value[currentChannel.value]) {
      messages.value[currentChannel.value] = [];
    }
    messages.value[currentChannel.value].push(tempSysMsg);
    messageText.value = '';
    scrollToBottom();
    
    // 模拟短延迟后更新（help 是本地命令，不需要网络请求）
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const helpText = `**猫娘助手的使用指南 喵~**

**普通用户:**
• \`/w @用户名 消息\` - 悄悄话功能喵~
• \`/help\` - 显示这个帮助 喵~

**管理员专用:**
• \`/op @用户名\` - 让他/她变成管理员喵~
• \`/deop @用户名\` - 收回管理员权限喵~
• \`/reg {邮箱} {用户名} {密码} {角色}\` - 注册新伙伴喵~
• \`/mute @用户名 {时间}\` - 让他/她安静一下 (10m/2h/1d/1w/perm)
• \`/mute list\` - 看看谁被禁言了喵~
• \`/mute rem @用户名\` - 解除禁言喵~
• \`/list\` - 列出所有小伙伴
• \`/kick @用户名\` - 送走用户喵...`;

    // 更新临时消息
    const msgIndex = messages.value[currentChannel.value].findIndex(m => m.stableId === stableId);
    if (msgIndex !== -1) {
      messages.value[currentChannel.value][msgIndex] = {
        ...messages.value[currentChannel.value][msgIndex],
        id: 'sys_' + Date.now(),
        content: helpText,
        isPending: false
      };
    }
    scrollToBottom();
    return;
  }

  // 判断是否是私聊消息
  const isWhisper = commandResult && commandResult.command === 'w';
  const targetUser = isWhisper ? commandResult.targetUser : '';
  const actualContent = isWhisper ? commandResult.content : content;

  const clientTimestamp = Date.now();
  const stableId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const tempId = 'temp_' + stableId;

  const tempMsg = {
    id: tempId,
    stableId: stableId, // 稳定的 ID，用于虚拟滚动
    username: props.user?.username || '游客',
    content: actualContent,
    created_at: clientTimestamp,
    author: { username: props.user?.username || '游客' },
    isWhisper: isWhisper,
    targetUser: targetUser
  };

  if (!messages.value[currentChannel.value]) {
    messages.value[currentChannel.value] = [];
  }
  messages.value[currentChannel.value].push(tempMsg);
  messageText.value = '';
  scrollToBottom();

  const data = await apiRequest(`channels/${currentChannel.value}/messages`, {
    method: 'POST',
    body: {
      content: actualContent,
      username: props.user?.username || '游客',
      timestamp: clientTimestamp,
      isWhisper: isWhisper,
      targetUser: targetUser
    }
  });

  if (data.success) {
    const index = messages.value[currentChannel.value].findIndex(m => m.stableId === stableId);
    if (index !== -1) {
      messages.value[currentChannel.value][index] = {
        ...data.data,
        stableId: stableId, // 保持稳定 ID 不变
        author: { username: data.data.username }
      };
      if (data.data.id) {
        lastMessageId.value = data.data.id;
      }
    }
  } else {
    messages.value[currentChannel.value] = messages.value[currentChannel.value].filter(m => m.stableId !== stableId);
    alert(data.message || '喵呜...消息发送失败了');
  }
};

// 长轮询
const longPollMessages = async () => {
  // 检查是否应该跳过本次轮询
  if (!currentChannel.value || !props.user || isLongPolling.value) {
    console.log('[长轮询] 跳过 - channel:', currentChannel.value, 'user:', !!props.user, 'polling:', isLongPolling.value);
    // 稍后重试
    setTimeout(longPollMessages, 1000);
    return;
  }

  if (!isOnline.value || !isPageVisible.value) {
    console.log('[长轮询] 网络离线或页面不可见 - online:', isOnline.value, 'visible:', isPageVisible.value);
    // 网络离线或页面不可见，稍后重试
    setTimeout(longPollMessages, 2000);
    return;
  }

  console.log('[长轮询] 开始轮询 - channel:', currentChannel.value, 'lastId:', lastMessageId.value);
  isLongPolling.value = true;
  longPollingAbortController.value = new AbortController();

  try {
    const startTime = Date.now();
    const url = `api.php?path=poll_messages&channel=${currentChannel.value}&last_id=${lastMessageId.value || ''}`;
    console.log('[长轮询] 请求 URL:', url);
    const res = await fetch(url, {
      signal: longPollingAbortController.value.signal
    });
    const data = await res.json();
    console.log('[长轮询] 响应:', data);
    recordApiRequest(startTime);

    longPollRetryCount.value = 0;
    longPollRetryDelay.value = 100;

    if (data.success && data.data && data.data.length > 0) {
      console.log('[长轮询] 接收到消息:', data.data.length, '条');
      const existingIds = new Set((messages.value[currentChannel.value] || []).map(m => m.id));
      const newMessages = data.data.filter(m =>
        !existingIds.has(m.id) && !m.id.startsWith('temp_')
      );

      if (newMessages.length > 0) {
        console.log('[长轮询] 添加新消息:', newMessages.length, '条');
        lastMessageId.value = newMessages[newMessages.length - 1].id;
        if (!messages.value[currentChannel.value]) {
          messages.value[currentChannel.value] = [];
        }
        // 使用 push 而不是扩展运算符，确保响应式更新
        newMessages.forEach(msg => {
          messages.value[currentChannel.value].push(msg);
        });
        console.log('[长轮询] 当前消息总数:', messages.value[currentChannel.value].length);
        recordMetric('messageRenderCount', newMessages.length);
        scrollToBottom();
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      console.log('长轮询被取消');
      return;
    }

    console.log('长轮询出错:', e);
    longPollRetryCount.value++;

    if (longPollRetryCount.value > 3) {
      longPollRetryDelay.value = Math.min(
        longPollRetryDelay.value * 2,
        maxRetryDelay
      );
    }

    if (longPollRetryCount.value > maxRetryCount) {
      console.log('长轮询重试次数过多，停止轮询');
      alert('喵？连接断开了，请刷新页面哦~');
      return;
    }
  } finally {
    isLongPolling.value = false;
    longPollingAbortController.value = null;

    // 持续轮询
    const delay = isOnline.value && isPageVisible.value ? longPollRetryDelay.value : 2000;
    setTimeout(longPollMessages, delay);
  }
};

// 心跳
const sendHeartbeat = async () => {
  if (!props.user?.username) return;
  try {
    await apiRequest('heartbeat', {
      method: 'POST',
      body: { username: props.user.username }
    });
    // 移除性能监控，因为心跳是高频操作
  } catch (e) {
    console.log('心跳发送失败', e);
  }
};

// 检查是否被踢出
const checkIfKicked = async () => {
  if (!props.user?.username) return;
  try {
    const result = await checkKicked();
    if (result.success && result.data?.kicked) {
      alert('喵呜...你被管理员请出去了，即将离开我们...');
      emit('logout');
    }
  } catch (e) {
    console.log('检查被踢状态失败', e);
  }
};

const fetchOnlineUsers = async () => {
  try {
    const data = await apiRequest('online_users');
    if (data.success) {
      onlineUsers.value = data.data;
    }
  } catch (e) {
    console.log('获取在线用户失败', e);
  }
};

// 滚动处理
const scrollToBottom = (smooth = false) => {
  nextTick(() => {
    // 使用 requestAnimationFrame 确保 DOM 完全渲染
    requestAnimationFrame(() => {
      if (messageListRef.value) {
        messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
      }
    });
  });
};

// @提及处理
const updateMentionSuggestions = (text, cursorPos) => {
  const mentionStart = findMentionStart(text, cursorPos);
  if (mentionStart === -1) {
    showMentionSuggestions.value = false;
    mentionSuggestions.value = [];
    return;
  }

  const searchTerm = text.substring(mentionStart + 1, cursorPos);
  mentionSearchTerm.value = searchTerm;

  // 使用缓存的用户列表，避免每次都遍历所有消息
  const allUsers = getCachedUserList();

  const filtered = allUsers.filter(username =>
    username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  mentionSuggestions.value = filtered;
  mentionSelectedIndex.value = 0;
  showMentionSuggestions.value = filtered.length > 0;
  mentionInputPos.value = mentionStart;
};

const selectMentionSuggestion = (username) => {
  if (!username) return;

  const text = messageText.value;
  const beforeMention = text.substring(0, mentionInputPos.value);
  const afterMention = text.substring(mentionInputPos.value + mentionSearchTerm.value.length + 1);

  messageText.value = beforeMention + '@' + username + ' ' + afterMention;
  showMentionSuggestions.value = false;
  mentionSuggestions.value = [];
  mentionSearchTerm.value = '';

  nextTick(() => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = messageText.value.length;
    }
  });
};

const handleMentionKeydown = (event) => {
  if (!showMentionSuggestions.value) return;

  const suggestions = mentionSuggestions.value;
  if (suggestions.length === 0) return;

  if (event.key === 'Tab' || event.key === 'Enter') {
    event.preventDefault();
    selectMentionSuggestion(suggestions[mentionSelectedIndex.value]);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    mentionSelectedIndex.value = (mentionSelectedIndex.value + 1) % suggestions.length;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    mentionSelectedIndex.value = (mentionSelectedIndex.value - 1 + suggestions.length) % suggestions.length;
  } else if (event.key === 'Escape') {
    showMentionSuggestions.value = false;
  }
};

const handleMentionInput = (event) => {
  const textarea = event.target;
  updateMentionSuggestions(textarea.value, textarea.selectionStart);
};

const handleMention = (username, event) => {
  event.preventDefault();
  const textarea = document.querySelector('textarea');
  if (textarea) {
    const currentText = messageText.value;
    const cursorPos = textarea.selectionStart;
    const beforeCursor = currentText.substring(0, cursorPos);
    const afterCursor = currentText.substring(cursorPos);

    if (beforeCursor.endsWith('@') || beforeCursor.endsWith('@ ')) {
      messageText.value = beforeCursor + username + ' ' + afterCursor;
    } else {
      messageText.value = beforeCursor + '@' + username + ' ' + afterCursor;
    }

    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = messageText.value.length;
  }
};

const logout = () => {
  removeToken();
  removeUser();
  emit('logout');
};

// 生命周期
onMounted(async () => {
  console.log('[应用] 组件已挂载，开始初始化...');
  await loadChannels();
  // 先加载当前频道的消息，初始化 lastMessageId
  await loadMessages(currentChannel.value);
  console.log('[应用] 频道和消息加载完成，500ms 后启动长轮询');
  setTimeout(longPollMessages, 500);
  sendHeartbeat();
  setInterval(sendHeartbeat, 1000);
  fetchOnlineUsers();

  // 检查是否被踢出（每 5 秒检查一次）
  checkIfKicked();
  setInterval(checkIfKicked, 5000);

  // 优化：在线用户获取从 1 秒改为 3 秒
  setInterval(fetchOnlineUsers, 3000);

  triggerIconUpdate();

  // 启动性能监控（仅开发环境），降低频率
  startPerformanceMonitoring(120000); // 每 2 分钟打印一次报告

  // 网络状态监听
  const handleOnline = () => {
    isOnline.value = true;
    longPollRetryCount.value = 0;
    longPollRetryDelay.value = 100;
  };
  const handleOffline = () => {
    isOnline.value = false;
  };

  const handleVisibilityChange = () => {
    isPageVisible.value = !document.hidden;
    if (isPageVisible.value) {
      longPollRetryDelay.value = 100;
      triggerIconUpdate(); // 页面可见时更新图标
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  window._appEventHandlers = {
    handleOnline,
    handleOffline,
    handleVisibilityChange
  };
});

onUnmounted(() => {
  if (longPollingAbortController.value) {
    longPollingAbortController.value.abort();
  }

  if (iconUpdateTimeout) {
    clearTimeout(iconUpdateTimeout);
  }

  if (window._appEventHandlers) {
    window.removeEventListener('online', window._appEventHandlers.handleOnline);
    window.removeEventListener('offline', window._appEventHandlers.handleOffline);
    document.removeEventListener('visibilitychange', window._appEventHandlers.handleVisibilityChange);
    delete window._appEventHandlers;
  }
});

watch(currentMessages, (newVal, oldVal) => {
  console.log('[Watch] 消息变化 - 新数量:', newVal.length, '旧数量:', oldVal?.length);
  scrollToBottom();
  // 消息变化时不立即更新图标，因为消息中没有图标
  // 侧边栏切换或频道切换时才需要更新图标
}, { deep: true }); // 添加深度监听

watch([showSidebar, channels, onlineUsers], () => {
  // 只在侧边栏、频道、在线用户变化时更新图标
  triggerIconUpdate();
});

// 监听消息数量变化，更新用户列表缓存
watch(messages, () => {
  // 标记用户列表缓存需要更新
  lastUserListUpdate.value = 0;
}, { deep: false }); // 不使用 deep，只监听引用变化
</script>

<style scoped>
.main-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  background: #1E1F22;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #2B2D31;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.header:hover {
  background-color: #1e2023;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.header__left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: bold;
  font-size: 1rem;
}

.header__right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header__username {
  font-size: 0.875rem;
  color: #949BA4;
}

.header__username.admin-name {
  color: #5865F2;
  font-weight: 600;
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.65rem;
  padding: 0.2rem 0.5rem;
  background: linear-gradient(135deg, #5865F2 0%, #4752C4 100%);
  color: #FFFFFF;
  border-radius: 0.25rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(88, 101, 242, 0.3);
}

.admin-badge .badge-icon {
  width: 10px;
  height: 10px;
  fill: currentColor;
}

.sidebar-toggle {
  display: none;
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.sidebar-toggle:hover {
  background-color: #35373C;
  transform: rotate(180deg);
}

.logout-btn {
  color: #949BA4;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0.5rem;
  border-radius: 0.5rem;
}

.logout-btn:hover {
  color: #DA373C;
  background-color: #35373C;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.sidebar-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 40;
  backdrop-filter: blur(4px);
}

.sidebar {
  background: #2B2D31;
  border-right: 1px solid #1E1F22;
  display: flex;
  flex-direction: column;
  width: 260px;
}

.sidebar-close {
  display: none;
  padding: 0.75rem;
  border-top: 1px solid #1E1F22;
  color: #949BA4;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-close:hover {
  color: white;
  background-color: #35373C;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #313338;
  min-width: 0;
}

.chat-header {
  height: 3rem;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #1E1F22;
}

.chat-header__title {
  font-weight: 600;
  color: #F2F3F5;
  letter-spacing: 0.2px;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.empty-state {
  color: #949BA4;
  text-align: center;
  padding: 3rem 2rem;
  animation: fadeIn 0.5s ease;
}

.input-area {
  padding: 1rem;
  background: #313338;
  border-top: 1px solid #1E1F22;
  position: relative;
}

.input-wrapper {
  display: flex;
  gap: 0.5rem;
}

.message-input {
  flex: 1;
  background: #383A40;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  outline: none;
  resize: none;
  max-height: 8rem;
  border: 2px solid transparent;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.message-input:focus {
  background-color: #404249;
  border-color: #5865F2;
  box-shadow: 0 0 0 4px rgba(88, 101, 242, 0.1), 0 4px 12px rgba(0, 0, 0, 0.15);
}

.send-btn {
  padding: 0.5rem 1rem;
  background: #5865F2;
  border-radius: 0.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.send-btn:hover {
  background: #4752c4;
  box-shadow: 0 4px 12px rgba(88, 101, 242, 0.4);
}

.send-btn:active {
  background: #3f4bb5;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.list-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.list-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 - 手机 */
@media (max-width: 640px) {
  .sidebar-toggle {
    display: flex;
  }

  .header__username {
    display: none;
  }

  .sidebar {
    position: fixed;
    left: -100%;
    top: 0;
    height: 100vh;
    width: 280px;
    max-width: 85vw;
    z-index: 50;
    transition: left 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 8px 0 30px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }

  .sidebar.open {
    left: 0;
  }

  .sidebar-overlay {
    display: block;
  }

  .sidebar-close {
    display: block;
  }
}
</style>