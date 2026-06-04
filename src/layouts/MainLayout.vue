<script setup lang="ts">
import { ArrowDown, Bell, Fold, User } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useAuthStore } from '@/stores/modules/auth'
import { useNotificationStore } from '@/stores/modules/notification'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const displayName = computed(() => authStore.currentUser?.nickname || authStore.currentUser?.phone || '未登录')

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="main-layout">
    <AppSidebar />
    <section class="main-layout__body">
      <header class="main-layout__topbar">
        <el-button :icon="Fold" text />
        <div class="main-layout__topbar-actions">
          <el-badge :value="notificationStore.unreadCount" :hidden="notificationStore.unreadCount === 0">
            <el-button :icon="Bell" text @click="router.push('/notifications')" />
          </el-badge>
          <el-dropdown>
            <button class="main-layout__user" type="button">
              <el-icon><User /></el-icon>
              <span>{{ displayName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/profile')">个人中心</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      <main class="main-layout__content">
        <router-view />
      </main>
    </section>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  min-height: 100vh;
  background: var(--ops-bg-page);
}

.main-layout__body {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.main-layout__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  border-bottom: 1px solid var(--ops-border-color);
  background: var(--ops-bg-panel);
  padding: 0 20px;
}

.main-layout__topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main-layout__user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: var(--ops-text-primary);
  cursor: pointer;
  font: inherit;
}

.main-layout__content {
  flex: 1;
  padding: 24px;
}
</style>
