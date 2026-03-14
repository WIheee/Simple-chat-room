<template>
  <div class="online-users">
    <h2 class="online-users__title">
      <span class="online-dot"></span>
      在线
      <span class="online-count">{{ onlineUsers.length }}</span>
    </h2>
    <transition-group name="list" tag="div" class="online-users__list">
      <div v-if="onlineUsers.length === 0" key="empty" class="empty-state">
        暂无在线用户
      </div>
      <div
        v-for="user in onlineUsers"
        :key="user.username"
        class="user-item"
      >
        <span class="online-dot"></span>
        <span class="user-item__name">{{ escapeHtml(user.username) }}</span>
        <span v-if="user.role === 'admin'" class="user-item__badge admin">管理员</span>
        <span v-if="user.username === currentUser" class="user-item__me">(我)</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { escapeHtml } from '../utils/helpers';

const props = defineProps({
  onlineUsers: {
    type: Array,
    default: () => []
  },
  currentUser: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.online-users {
  flex: 1;
  padding: 0.75rem;
  overflow-y: auto;
}

.online-users__title {
  font-size: 0.75rem;
  font-weight: bold;
  color: #949BA4;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.online-count {
  color: #23A559;
}

.online-users__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.empty-state {
  font-size: 0.875rem;
  padding: 0.5rem 0;
  color: #949BA4;
  text-align: center;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  transition: all 0.15s ease;
  animation: fadeInUp 0.3s ease-out;
}

.user-item:hover {
  background-color: #35373C;
  transform: scale(1.02);
}

.user-item__name {
  font-size: 0.875rem;
  color: #DBDEE1;
}

.user-item__me {
  font-size: 0.75rem;
  color: #949BA4;
  margin-left: 0.25rem;
}

.user-item__badge {
  font-size: 0.6rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.user-item__badge.admin {
  background: linear-gradient(135deg, #5865F2 0%, #4752C4 100%);
  color: #FFFFFF;
  box-shadow: 0 1px 3px rgba(88, 101, 242, 0.3);
}

.online-dot {
  width: 10px;
  height: 10px;
  background-color: #23A559;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px #2B2D31, 0 0 6px rgba(35, 165, 89, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.online-dot::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  background-color: #23A559;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(1);
  animation: onlinePulse 2s ease-in-out infinite;
  opacity: 0;
}

@keyframes onlinePulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0.3;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(5px);
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
</style>