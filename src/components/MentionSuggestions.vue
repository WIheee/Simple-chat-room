<template>
  <transition name="fade">
    <div v-if="show" class="mention-suggestions">
      <div
        v-for="(username, index) in suggestions"
        :key="username"
        :class="['mention-item', { selected: index === selectedIndex }]"
        @click="selectSuggestion(username)"
      >
        <span class="mention-symbol">@</span>
        <span class="mention-text">
          <span class="mention-highlight">{{ searchTerm }}</span>
          <span class="mention-rest">{{ username.substring(searchTerm.length) }}</span>
        </span>
      </div>
    </div>
  </transition>
</template>

<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  suggestions: {
    type: Array,
    default: () => []
  },
  searchTerm: {
    type: String,
    default: ''
  },
  selectedIndex: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['select']);

const selectSuggestion = (username) => {
  emit('select', username);
};
</script>

<style scoped>
.mention-suggestions {
  position: absolute;
  bottom: 100%;
  left: 1rem;
  right: 1rem;
  margin-bottom: 0.5rem;
  background: #2B2D31;
  border-radius: 0.5rem;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
  border: 1px solid #404249;
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  animation: mentionSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.mention-item {
  padding: 0.625rem 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mention-item:hover,
.mention-item.selected {
  background: #404249;
}

.mention-item:active {
  background: #35373C;
  transform: scale(0.98);
}

.mention-symbol {
  color: #5865F2;
  font-weight: 600;
  flex-shrink: 0;
}

.mention-text {
  color: #DBDEE1;
  font-size: 0.875rem;
}

.mention-highlight {
  color: #FFF;
  font-weight: 600;
}

.mention-rest {
  color: #949BA4;
}

.mention-suggestions::-webkit-scrollbar {
  width: 6px;
}

.mention-suggestions::-webkit-scrollbar-track {
  background: transparent;
}

.mention-suggestions::-webkit-scrollbar-thumb {
  background: #404249;
  border-radius: 3px;
}

.mention-suggestions::-webkit-scrollbar-thumb:hover {
  background: #505359;
}

@keyframes mentionSlideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>