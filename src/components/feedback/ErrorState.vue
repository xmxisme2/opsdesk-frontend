<script setup lang="ts">
import { Warning } from '@element-plus/icons-vue'

defineProps<{
  message?: string
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="error-state">
    <el-icon :size="28"><Warning /></el-icon>
    <span>{{ message || '加载失败' }}</span>
    <el-button type="primary" link @click="$emit('retry')">重试</el-button>
  </div>
</template>

<style scoped>
.error-state {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 160px;
  color: var(--ops-danger-color);
}
</style>
