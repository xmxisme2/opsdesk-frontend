<script setup lang="ts">
import EmptyState from '@/components/feedback/EmptyState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'

defineProps<{
  loading?: boolean
  error?: string
  empty?: boolean
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <section v-loading="loading" class="data-table">
    <slot v-if="!error && !empty" />
    <ErrorState v-else-if="error" :message="error" @retry="$emit('retry')" />
    <EmptyState v-else message="暂无数据" />
  </section>
</template>

<style scoped>
.data-table {
  min-height: 220px;
  border: 1px solid var(--ops-border-color);
  border-radius: 8px;
  background: var(--ops-bg-panel);
  padding: 16px;
}
</style>
