<script setup lang="ts">
import * as Icons from '@element-plus/icons-vue'
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { isNavigationFailure, NavigationFailureType, useRoute, useRouter } from 'vue-router'
import { usePermissionStore } from '@/stores/modules/permission'

const permissionStore = usePermissionStore()
const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.meta.activeMenu || route.path)

function resolveIcon(name: string) {
  return Icons[name as keyof typeof Icons] || Icons.Menu
}

/**
 * 统一由 el-menu 的 select 事件驱动导航，避免菜单项 click 与组件内部选中事件在快速点击时重复触发。
 * 取消和重复导航属于快速切换的正常结果，只有真实路由异常才向用户提示。
 */
async function openMenu(path: string) {
  if (path === route.path) {
    return
  }
  try {
    const failure = await router.push(path)
    if (failure
      && !isNavigationFailure(failure, NavigationFailureType.cancelled)
      && !isNavigationFailure(failure, NavigationFailureType.duplicated)) {
      ElMessage.error('页面跳转失败，请重试')
    }
  } catch {
    ElMessage.error('页面跳转失败，请重试')
  }
}
</script>

<template>
  <aside class="app-sidebar">
    <div class="app-sidebar__brand">
      <div class="app-sidebar__mark">OD</div>
      <div>
        <strong>OpsDesk</strong>
        <span>智能工单协作平台</span>
      </div>
    </div>

    <el-menu class="app-sidebar__menu" :default-active="activeMenu" background-color="transparent" text-color="#b8c2d4" active-text-color="#ffffff" @select="openMenu">
      <template v-for="menu in permissionStore.menus" :key="menu.path">
        <el-sub-menu v-if="menu.children?.length" :index="menu.path">
          <template #title>
            <el-icon><component :is="resolveIcon(menu.icon)" /></el-icon>
            <span>{{ menu.title }}</span>
          </template>
          <el-menu-item v-for="child in menu.children" :key="child.path" :index="child.path">
            <el-icon><component :is="resolveIcon(child.icon)" /></el-icon>
            <span>{{ child.title }}</span>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item v-else :index="menu.path">
          <el-icon><component :is="resolveIcon(menu.icon)" /></el-icon>
          <span>{{ menu.title }}</span>
        </el-menu-item>
      </template>
    </el-menu>
  </aside>
</template>

<style scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  width: 232px;
  min-width: 232px;
  min-height: 100vh;
  background: #121721;
  color: #ffffff;
}

.app-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 68px;
  padding: 0 18px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.app-sidebar__mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--ops-primary-color);
  font-weight: 700;
}

.app-sidebar__brand strong,
.app-sidebar__brand span {
  display: block;
  line-height: 1.3;
}

.app-sidebar__brand span {
  margin-top: 2px;
  color: #b8c2d4;
  font-size: 12px;
}

.app-sidebar__menu {
  flex: 1;
  border-right: 0;
  padding: 10px 8px;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  height: 42px;
  border-radius: 8px;
  margin-bottom: 4px;
}

:deep(.el-menu-item.is-active) {
  background: #1a4785;
}
</style>
