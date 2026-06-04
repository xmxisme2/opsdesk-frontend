import { ref } from 'vue'
import { defineStore } from 'pinia'
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '@/constants/dictionaries'
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/constants/ticket'
import type { OptionItem } from '@/types/api'

export const useDictionariesStore = defineStore('dictionaries', () => {
  const userStatusOptions = ref<OptionItem[]>(USER_STATUS_OPTIONS)
  const userRoleOptions = ref<OptionItem[]>(USER_ROLE_OPTIONS)
  const ticketStatusLabels = ref(TICKET_STATUS_LABELS)
  const ticketPriorityLabels = ref(TICKET_PRIORITY_LABELS)

  // 字典首版先使用前端静态值，后续可切换为系统配置接口返回值。
  return {
    userStatusOptions,
    userRoleOptions,
    ticketStatusLabels,
    ticketPriorityLabels,
  }
})
