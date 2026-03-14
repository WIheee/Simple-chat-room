<template>
  <div class="auth-page">
    <div class="auth-form">
      <div class="auth-form__tabs">
        <button
          @click="currentTab = 'login'"
          :class="['tab-btn', { active: currentTab === 'login' }]"
        >
          登录
        </button>
        <button
          @click="currentTab = 'register'"
          :class="['tab-btn', { active: currentTab === 'register' }]"
        >
          注册
        </button>
      </div>

      <transition name="list" mode="out-in">
        <div v-if="currentTab === 'login'" key="login" class="auth-form__content">
          <div class="form-group">
            <label class="form-label">邮箱</label>
            <input
              v-model="loginForm.email"
              type="email"
              class="form-input"
              placeholder="your@email.com"
            >
          </div>
          <div class="form-group">
            <label class="form-label">密码</label>
            <input
              v-model="loginForm.password"
              type="password"
              class="form-input"
              placeholder="••••••••"
            >
          </div>
          <button
            @click="handleLogin"
            class="form-submit"
          >
            登录
          </button>
        </div>

        <div v-else key="register" class="auth-form__content">
          <div class="form-group">
            <label class="form-label">邮箱</label>
            <input
              v-model="registerForm.email"
              type="email"
              class="form-input"
              placeholder="your@email.com"
            >
          </div>
          <div class="form-group">
            <label class="form-label">用户名</label>
            <input
              v-model="registerForm.username"
              type="text"
              class="form-input"
              placeholder="用户名"
            >
          </div>
          <div class="form-group">
            <label class="form-label">密码</label>
            <input
              v-model="registerForm.password"
              type="password"
              class="form-input"
              placeholder="••••••••"
            >
          </div>
          <button
            @click="handleRegister"
            class="form-submit"
          >
            注册
          </button>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { apiRequest } from '../utils/api';

const emit = defineEmits(['success']);

const currentTab = ref('login');
const loginForm = ref({
  email: '',
  password: ''
});
const registerForm = ref({
  email: '',
  username: '',
  password: ''
});

const handleLogin = async () => {
  if (!loginForm.value.email || !loginForm.value.password) {
    alert('请填写完整');
    return;
  }

  const data = await apiRequest('auth/login', {
    method: 'POST',
    body: loginForm.value
  });

  if (data.success) {
    emit('success', {
      token: data.data.token,
      user: data.data.user
    });
  } else {
    alert(data.message || '登录失败');
  }
};

const handleRegister = async () => {
  if (!registerForm.value.email || !registerForm.value.username || !registerForm.value.password) {
    alert('请填写完整');
    return;
  }

  const data = await apiRequest('auth/register', {
    method: 'POST',
    body: registerForm.value
  });

  if (data.success) {
    emit('success', {
      token: data.data.token,
      user: data.data.user
    });
  } else {
    alert(data.message || '注册失败');
  }
};
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.auth-form {
  width: 100%;
  max-width: 28rem;
  padding: 2rem;
  background-color: #2B2D31;
  border-radius: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
  animation: authFormSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.auth-form::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.03),
    transparent
  );
  animation: authFormShine 3s ease-in-out infinite;
}

@keyframes authFormShine {
  0% {
    left: -100%;
  }
  50%, 100% {
    left: 100%;
  }
}

@keyframes authFormSlideUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.auth-form__tabs {
  display: flex;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #404249;
}

.tab-btn {
  flex: 1;
  padding: 0.75rem;
  font-weight: bold;
  font-size: 1rem;
  background: none;
  border: none;
  color: #949BA4;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-bottom: 2px solid transparent;
  position: relative;
}

.tab-btn::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #5865F2;
  transform: scaleX(0);
  transition: transform 0.2s ease;
}

.tab-btn.active::after {
  transform: scaleX(1);
}

.tab-btn.active {
  color: #5865F2;
}

.tab-btn:not(.active):hover {
  color: #B5BAC1;
}

.auth-form__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #949BA4;
}

.form-input {
  width: 100%;
  background: #1E1F22;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  outline: none;
  border: 2px solid transparent;
  font-size: 1rem;
  color: #DBDEE1;
  transition: all 0.2s ease;
}

.form-input:focus {
  box-shadow: 0 0 0 2px #5865F2;
}

.form-submit {
  width: 100%;
  background: #5865F2;
  color: white;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.form-submit:hover {
  background: #4752c4;
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(88, 101, 242, 0.3);
}

.form-submit:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(88, 101, 242, 0.2);
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