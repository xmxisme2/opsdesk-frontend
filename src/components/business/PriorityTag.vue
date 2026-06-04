<script setup lang="ts">
import { computed } from 'vue'
import { TICKET_PRIORITY_LABELS } from '@/constants/ticket'
import type { TicketPriority } from '@/types/ticket'

const props = defineProps<{
  priority: TicketPriority
}>()

const tagType = computed(() => {
  if (props.priority === 'URGENT') {
    return 'danger'
  }
  if (props.priority === 'HIGH') {
    return 'warning'
  }
  if (props.priority === 'LOW') {
    return 'info'
  }
  return 'primary'
})
</script>

<template>
  <el-tag :type="tagType">{{ TICKET_PRIORITY_LABELS[priority] }}</el-tag>
</template>
