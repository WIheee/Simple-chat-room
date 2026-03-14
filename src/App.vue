<template>
  <div id="app">
    <!-- 登录/注册页 -->
    <transition name="fade">
      <AuthPage
        v-if="!isAuthenticated"
        @success="handleAuthSuccess"
      />
    </transition>

    <!-- 主应用 -->
    <transition name="page">
      <MainApp
        v-if="isAuthenticated && user"
        :user="user"
        @logout="handleLogout"
      />
    </transition>

    <!-- Toast 提示 -->
    <Toast
      v-if="toast.show"
      :message="toast.message"
      :type="toast.type"
      @close="toast.show = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import AuthPage from './pages/AuthPage.vue';
import MainApp from './pages/MainApp.vue';
import Toast from './components/Toast.vue';
import { getToken, getUser, setToken, setUser, removeToken, removeUser, apiRequest } from './utils/api';

const toast = ref({
  show: false,
  message: '',
  type: 'success'
});

const token = ref('');
const user = ref(null);

const isAuthenticated = computed(() => !!token.value && !!user.value);

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type };
};

const handleAuthSuccess = async ({ token: newToken, user: newUser }) => {
  token.value = newToken;
  user.value = newUser;
  setToken(newToken);
  setUser(newUser);
  showToast('登录成功');
};

const handleLogout = () => {
  token.value = '';
  user.value = null;
  removeToken();
  removeUser();
  showToast('已退出登录', 'success');
};

onMounted(async () => {
  const savedToken = getToken();
  const savedUser = getUser();

  if (savedToken && savedUser) {
    token.value = savedToken;
    
    // 从服务器获取最新的用户信息（包括角色）
    try {
      const data = await apiRequest('auth/me');
      if (data.success) {
        user.value = data.data;
        setUser(data.data); // 更新 localStorage
      } else {
        // token 无效，清除登录状态
        token.value = '';
        user.value = null;
        removeToken();
        removeUser();
      }
    } catch (e) {
      // 网络错误，使用缓存的数据
      user.value = savedUser;
    }
  }
});
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 页面过渡动画 */
.page-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.page-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>