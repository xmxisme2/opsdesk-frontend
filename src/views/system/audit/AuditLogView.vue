<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['操作人', '业务类型', '操作类型', '时间范围']
</script>

<template>
  <!-- 审计日志不可由普通用户删除，后台仅提供检索和追溯。 -->
  <PageHeader title="操作日志" />
  <FeaturePlaceholder title="审计日志检索" phase="P2 预留" :items="items" />
</template>
