<template>
  <div class="channel-list">
    <h2 class="channel-list__title">
      <i data-lucide="hash" class="w-4 h-4"></i>
      频道
    </h2>
    <transition-group name="list" tag="div" class="channel-list__items">
      <div
        v-for="channel in channels"
        :key="channel.id"
        @click="selectChannel(channel.id)"
        :class="['channel-item', { active: currentChannel === channel.id }]"
      >
        <i data-lucide="hash" class="w-4 h-4 text-[#949BA4]"></i>
        <span class="channel-item__name">{{ escapeHtml(channel.name) }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { nextTick } from 'vue';
import { escapeHtml } from '../utils/helpers';

const props = defineProps({
  channels: {
    type: Array,
    default: () => []
  },
  currentChannel: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['select']);

const selectChannel = (id) => {
  emit('select', id);
  nextTick(() => {
    lucide.createIcons();
  });
};
</script>

<style scoped>
.channel-list {
  padding: 0.75rem;
  border-bottom: 1px solid #1E1F22;
}

.channel-list__title {
  font-size: 0.75rem;
  font-weight: bold;
  color: #949BA4;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.channel-list__items {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.channel-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  position: relative;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.channel-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: #FFF;
  border-radius: 0 2px 2px 0;
  transform: scaleY(0);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.channel-item:hover {
  background: linear-gradient(90deg, #35373C 0%, #2B2D31 100%);
  transform: translateX(6px);
}

.channel-item:hover .w-4 {
  transform: rotate(5deg) scale(1.1);
  transition: transform 0.2s ease;
}

.channel-item.active {
  background: linear-gradient(90deg, #4f545c 0%, #404249 100%);
  color: #FFF;
}

.channel-item.active::before {
  transform: scaleY(1);
}

.channel-item.active .w-4 {
  color: #FFF;
}

.channel-item__name {
  font-size: 0.875rem;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-15px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
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