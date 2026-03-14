<template>
  <div
    v-if="canView"
    :class="['message-item', { 'temp-message': isTemp, 'my-message': isMyMessage, 'whisper-message': isWhisper }]"
  >
    <div
      class="message-avatar"
      @touchstart.prevent="handleLongPress"
      @contextmenu.prevent="handleLongPress"
    >
      {{ avatarChar }}
    </div>
    <div class="message-content">
      <div :class="['message-header', { 'justify-end': isMyMessage }]">
        <!-- 管理员徽章（蓝底白字，Discord风格） -->
        <span v-if="isAdmin && !isSystem" class="admin-badge">
          <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          管理员
        </span>
        <span :class="['username', { me: isMyMessage, system: isSystem, error: props.message.isError }]">
          {{ escapeHtml(username) }}
        </span>
        <span v-if="isWhisper" class="whisper-badge">
          <i data-lucide="eye-off" class="w-3 h-3"></i>
          私聊
        </span>
        <span v-if="isTemp" class="sending-text">发送中...</span>
        <span v-if="props.message.isPending" class="sending-text">执行中...</span>
        <div v-if="isMentioned" class="mention-badge" title="你被提及了">
          <div class="mention-dot"></div>
        </div>
        <span class="message-time">{{ formattedTime }}</span>
      </div>
      <div class="message-text" v-html="parsedContent"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { escapeHtml, formatTime, parseMentions, getAvatarChar, isUserMentioned as checkMentioned } from '../utils/helpers';
import { canViewMessage } from '../commands';

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  currentUser: {
    type: String,
    default: ''
  },
  userRole: {
    type: String,
    default: 'user'
  }
});

const emit = defineEmits(['mention']);

// 使用 stableId 作为唯一标识，避免因 id 变化导致的重新渲染
const messageId = computed(() => props.message.stableId || props.message.id);
const username = computed(() => props.message.username || '用户');
const content = computed(() => props.message.content || '');
const createdAt = computed(() => props.message.created_at);
const isTemp = computed(() => props.message.id?.startsWith('temp_'));
const isMyMessage = computed(() => username.value === props.currentUser);
const isWhisper = computed(() => props.message.isWhisper === true);

// 检查当前用户是否有权限查看此消息
const canView = computed(() => canViewMessage(props.message, props.currentUser));

const avatarChar = computed(() => getAvatarChar(username.value));
const formattedTime = computed(() => formatTime(createdAt.value));
const parsedContent = computed(() => parseMentions(content.value));
const isMentioned = computed(() => checkMentioned(content.value, props.currentUser));
const isAdmin = computed(() => props.userRole === 'admin');
const isSystem = computed(() => props.message.isSystem === true);

const handleLongPress = (event) => {
  emit('mention', username.value, event);
};
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 0.75rem;
  border-radius: 0.5rem;
  margin: 0.25rem 0.5rem;
  padding: 0.75rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  animation: messageSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  content-visibility: auto;
  contain-intrinsic-size: auto 100px;
  will-change: transform, opacity;
}

.message-item:hover {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-item:active {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
  transform: translateX(2px);
}

.my-message {
  flex-direction: row-reverse;
}

.my-message .message-content {
  flex: 0 1 auto;
  max-width: 70%;
  width: fit-content;
  min-width: 0;
}

/* 私聊消息样式 */
.whisper-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(88, 101, 242, 0.2);
  color: #5865F2;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.temp-message,
.message-item:has(.sending-text) {
  opacity: 0.7;
  animation: sendingPulse 1s ease-in-out infinite;
}

.message-avatar {
  width: 40px;
  height: 40px;
  background: #5865F2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 1rem;
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  will-change: transform, box-shadow;
}

.message-item:hover .message-avatar {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(88, 101, 242, 0.3);
}

.message-avatar:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(88, 101, 242, 0.4);
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.message-header.justify-end {
  justify-content: flex-end;
}

.username {
  font-weight: 600;
  color: #F2F3F5;
  letter-spacing: 0.2px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.username:hover {
  color: #FFF;
  text-decoration: underline;
  text-decoration-color: #5865F2;
}

.username.me {
  color: #5865F2;
}

.username.me:hover {
  color: #7983f5;
  text-decoration-color: #7983f5;
}

.username.system {
  color: #5865F2;
  font-weight: 600;
}

.username.error {
  color: #DA373C;
}

/* 管理员徽章 - Discord 风格蓝底白字 */
.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #5865F2 0%, #4752C4 100%);
  color: #FFFFFF;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(88, 101, 242, 0.3);
  margin-right: 0.5rem;
}

.admin-badge .badge-icon {
  width: 10px;
  height: 10px;
  fill: currentColor;
}

.sending-text {
  color: #5d5f64;
  font-size: 0.75rem;
  margin-left: 0.25rem;
  animation: pulse 1.5s ease-in-out infinite;
}

.mention-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 0.25rem;
}

.mention-dot {
  width: 8px;
  height: 8px;
  background-color: #DA373C;
  border-radius: 50%;
  box-shadow: 0 0 0 2px #313338, 0 0 4px rgba(218, 55, 60, 0.4);
  animation: mentionDotPulse 2s ease-in-out infinite;
}

.message-time {
  font-size: 0.75rem;
  color: #949BA4;
  letter-spacing: 0.2px;
  transition: all 0.2s ease;
  cursor: default;
}

.message-time:hover {
  color: #B5BAC1;
  transform: scale(1.05);
}

.message-text {
  color: #DBDEE1;
  line-height: 1.6;
  word-wrap: break-word;
  word-break: break-word;
}

/* Markdown 样式 */
.message-text :deep(p) {
  margin: 0.25rem 0;
}

.message-text :deep(p:first-child) {
  margin-top: 0;
}

.message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875em;
  color: #E8B896;
}

.message-text :deep(pre) {
  background: rgba(0, 0, 0, 0.4);
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin: 0.5rem 0;
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.message-text :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #DBDEE1;
}

.message-text :deep(blockquote) {
  border-left: 3px solid #5865F2;
  padding-left: 0.75rem;
  margin: 0.5rem 0;
  color: #949BA4;
  font-style: italic;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 0.25rem 0;
  padding-left: 1.5rem;
}

.message-text :deep(li) {
  margin: 0.125rem 0;
}

.message-text :deep(strong) {
  font-weight: 700;
  color: #F2F3F5;
}

.message-text :deep(em) {
  font-style: italic;
  color: #B5BAC1;
}

.message-text :deep(a) {
  color: #5865F2;
  text-decoration: none;
  transition: all 0.2s ease;
}

.message-text :deep(a:hover) {
  text-decoration: underline;
  color: #7983f5;
}

.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3),
.message-text :deep(h4),
.message-text :deep(h5),
.message-text :deep(h6) {
  margin: 0.5rem 0 0.25rem 0;
  font-weight: 700;
  color: #F2F3F5;
}

.message-text :deep(h1) {
  font-size: 1.5em;
}

.message-text :deep(h2) {
  font-size: 1.25em;
}

.message-text :deep(h3) {
  font-size: 1.125em;
}

.message-text :deep(hr) {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 0.75rem 0;
}

.message-text :deep(table) {
  border-collapse: collapse;
  margin: 0.5rem 0;
  width: 100%;
}

.message-text :deep(th),
.message-text :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.375rem 0.5rem;
  text-align: left;
}

.message-text :deep(th) {
  background: rgba(0, 0, 0, 0.2);
  font-weight: 600;
}

.message-text :deep(img) {
  max-width: 100%;
  border-radius: 0.375rem;
  margin: 0.25rem 0;
}

/* 删除线 */
.message-text :deep(del),
.message-text :deep(s) {
  color: #949BA4;
  text-decoration: line-through;
}

/* 任务列表 */
.message-text :deep(ul li input[type="checkbox"]) {
  margin-right: 0.5rem;
  cursor: pointer;
}

.message-text :deep(ul.contains-task-list) {
  list-style: none;
  padding-left: 0;
}

.message-text :deep(li.task-list-item) {
  display: flex;
  align-items: flex-start;
  margin: 0.25rem 0;
}

.message-text :deep(li.task-list-item::marker) {
  content: none;
}

/* 表格增强 */
.message-text :deep(tr:nth-child(even)) {
  background: rgba(0, 0, 0, 0.1);
}

.message-text :deep(table) {
  font-size: 0.9em;
}

.message-text :deep(.mention) {
  background: rgba(88, 101, 242, 0.15);
  color: #5865F2;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.message-text :deep(.mention:hover) {
  background: rgba(88, 101, 242, 0.25);
  text-decoration: underline;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY3d(15px, 0, 0) scale3d(0.98, 0.98, 1);
  }
  to {
    opacity: 1;
    transform: translateY3d(0, 0, 0) scale3d(1, 1, 1);
  }
}

@keyframes sendingPulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

@keyframes mentionDotPulse {
  0%, 100% {
    transform: scale3d(1, 1, 1);
    box-shadow: 0 0 0 2px #313338, 0 0 4px rgba(218, 55, 60, 0.4);
  }
  50% {
    transform: scale3d(1.2, 1.2, 1);
    box-shadow: 0 0 0 2px #313338, 0 0 8px rgba(218, 55, 60, 0.6);
  }
}
</style>