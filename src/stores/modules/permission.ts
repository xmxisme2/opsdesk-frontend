import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { APP_MENUS } from '@/constants/permissions'
import { filterMenusByPermission } from '@/utils/route-permission'
import { useAuthStore } from './auth'

export const usePermissionStore = defineStore('permission', () => {
  const aiEnabled = ref(import.meta.env.VITE_AI_ENTRY_ENABLED === 'true')
  const authStore = useAuthStore()

  const menus = computed(() => filterMenusByPermission(APP_MENUS, authStore.roleCodes, aiEnabled.value))

  // AI 入口由系统配置控制；当前初始化阶段默认关闭，后续从接口刷新。
  function setAiEnabled(enabled: boolean) {
    aiEnabled.value = enabled
  }

  return {
    aiEnabled,
    menus,
    setAiEnabled,
  }
})
