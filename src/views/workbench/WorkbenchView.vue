<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['待办摘要', '我创建与我处理', '站内通知', '快捷创建工单']
</script>

<template>
  <!-- 工作台后续接入 /api/workbench/summary，当前先建立首页容器。 -->
  <PageHeader title="工作台" description="今日待办、通知和工单入口" />
  <FeaturePlaceholder title="工作台首页" phase="基础骨架" :items="items" />
</template>
