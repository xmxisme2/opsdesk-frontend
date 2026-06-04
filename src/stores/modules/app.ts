import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // 应用级状态只保存 UI 偏好，不承载业务权限。
  return {
    sidebarCollapsed,
    toggleSidebar,
  }
})
