<script setup lang="ts">
defineProps<{
  page: number
  size: number
  total: number
}>()

defineEmits<{
  'update:page': [value: number]
  'update:size': [value: number]
}>()
</script>

<template>
  <div class="pagination-bar">
    <el-pagination
      background
      layout="total, sizes, prev, pager, next"
      :current-page="page"
      :page-size="size"
      :total="total"
      @update:current-page="$emit('update:page', $event)"
      @update:page-size="$emit('update:size', $event)"
    />
  </div>
</template>

<style scoped>
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}
</style>
