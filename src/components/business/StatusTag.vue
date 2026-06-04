<script setup lang="ts">
import { computed } from 'vue'
import { TICKET_STATUS_LABELS } from '@/constants/ticket'
import type { TicketStatus } from '@/types/ticket'

const props = defineProps<{
  status: TicketStatus
}>()

const tagType = computed(() => {
  if (props.status === 'CLOSED' || props.status === 'COMPLETED') {
    return 'success'
  }
  if (props.status === 'CANCELLED') {
    return 'info'
  }
  if (props.status === 'PENDING_CONFIRM') {
    return 'warning'
  }
  return 'primary'
})
</script>

<template>
  <el-tag :type="tagType">{{ TICKET_STATUS_LABELS[status] }}</el-tag>
</template>
