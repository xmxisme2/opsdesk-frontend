<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDictionariesStore } from '@/stores/modules/dictionaries'
import type { TicketPriority } from '@/types/ticket'
import { priorityDisplay, priorityTagStyle } from '@/utils/priority-options'

const props = defineProps<{
  priority: TicketPriority
}>()

const dictionariesStore = useDictionariesStore()
const { ticketPriorityOptions } = storeToRefs(dictionariesStore)

// 首次渲染直接使用 Store 内置四项，远端配置返回后响应式更新名称和颜色。
void dictionariesStore.loadTicketPriorities()

const display = computed(() => priorityDisplay(ticketPriorityOptions.value, props.priority))
const tagStyle = computed(() => priorityTagStyle(display.value))
</script>

<template>
  <el-tag class="priority-tag" :style="tagStyle">{{ display.name }}</el-tag>
</template>

<style scoped>
.priority-tag {
  color: var(--priority-color);
  background-color: color-mix(in srgb, var(--priority-color) 12%, white);
  border-color: color-mix(in srgb, var(--priority-color) 35%, white);
}
</style>
