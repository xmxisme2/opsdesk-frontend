<script setup lang="ts">
import { FolderOpened } from '@element-plus/icons-vue'

defineProps<{
  message?: string
}>()
</script>

<template>
  <div class="empty-state">
    <el-icon :size="28"><FolderOpened /></el-icon>
    <span>{{ message || '暂无内容' }}</span>
  </div>
</template>

<style scoped>
.empty-state {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 160px;
  color: var(--ops-text-secondary);
}
</style>
