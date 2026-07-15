import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getPriorityOptions } from '@/api/modules/system'
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '@/constants/dictionaries'
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/constants/ticket'
import type { OptionItem } from '@/types/api'
import { createPriorityOptionsLoader, normalizePriorityOptions } from '@/utils/priority-options'

export const useDictionariesStore = defineStore('dictionaries', () => {
  const userStatusOptions = ref<OptionItem[]>(USER_STATUS_OPTIONS)
  const userRoleOptions = ref<OptionItem[]>(USER_ROLE_OPTIONS)
  const ticketStatusLabels = ref(TICKET_STATUS_LABELS)
  const ticketPriorityLabels = ref(TICKET_PRIORITY_LABELS)
  const ticketPriorityOptions = ref(normalizePriorityOptions([]))
  const priorityLoaded = ref(false)
  let priorityLoading: Promise<void> | null = null
  const priorityLoader = createPriorityOptionsLoader(getPriorityOptions)

  // 优先级配置失败时保持内置四项且不向业务页面抛错；默认请求复用进行中任务，force 用于管理配置后刷新。
  async function loadTicketPriorities(force = false) {
    if (priorityLoaded.value && !force) {
      return
    }
    if (priorityLoading && !force) {
      return priorityLoading
    }
    const task = priorityLoader.load(force).then((result) => {
      ticketPriorityOptions.value = result.options
      priorityLoaded.value = result.loaded
    })
    priorityLoading = task
    try {
      await task
    } finally {
      if (priorityLoading === task) {
        priorityLoading = null
      }
    }
  }

  // 通用字典仍保留静态兼容字段，优先级通过独立配置数组渐进接入业务页面。
  return {
    userStatusOptions,
    userRoleOptions,
    ticketStatusLabels,
    ticketPriorityLabels,
    ticketPriorityOptions,
    priorityLoaded,
    loadTicketPriorities,
  }
})
