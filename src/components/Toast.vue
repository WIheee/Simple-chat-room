<template>
  <transition name="toast">
    <div
      v-if="show"
      :class="['toast', `toast-${type}`]"
    >
      {{ message }}
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'success',
    validator: (value) => ['success', 'error'].includes(value)
  },
  duration: {
    type: Number,
    default: 3000
  }
});

const emit = defineEmits(['close']);

const show = ref(true);

watch(() => props.message, (newMessage) => {
  if (newMessage) {
    show.value = true;
    setTimeout(() => {
      show.value = false;
      emit('close');
    }, props.duration);
  }
}, { immediate: true });
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 50;
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  color: white;
  font-weight: 500;
}

.toast-success {
  background-color: #23A559;
}

.toast-error {
  background-color: #DA373C;
}

.toast-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>