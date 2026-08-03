import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { APP_MENUS } from '@/constants/permissions'
import { filterMenusByPermission } from '@/utils/route-permission'
import { useAuthStore } from './auth'

export const usePermissionStore = defineStore('permission', () => {
  const aiEnabled = ref(import.meta.env.VITE_AI_ENTRY_ENABLED !== 'false')
  const authStore = useAuthStore()

  const menus = computed(() => filterMenusByPermission(APP_MENUS, authStore.roleCodes, aiEnabled.value))

  // AI 服务已完成首版接入，入口默认开启；仍可通过构建变量或后续系统配置动态关闭。
  function setAiEnabled(enabled: boolean) {
    aiEnabled.value = enabled
  }

  return {
    aiEnabled,
    menus,
    setAiEnabled,
  }
})
