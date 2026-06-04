import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getUnreadCount } from '@/api/modules/notifications'

export const useNotificationStore = defineStore('notification', () => {
  const unreadCount = ref(0)
  const loading = ref(false)

  async function refreshUnreadCount() {
    loading.value = true
    try {
      const result = await getUnreadCount()
      unreadCount.value = result.count
    } finally {
      loading.value = false
    }
  }

  // 未读数状态只作为展示缓存，真实已读状态以后端返回为准。
  function setUnreadCount(count: number) {
    unreadCount.value = count
  }

  return {
    unreadCount,
    loading,
    refreshUnreadCount,
    setUnreadCount,
  }
})
