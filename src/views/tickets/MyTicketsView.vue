<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['我创建', '我处理', '我关注', 'Tab 快速切换']
</script>

<template>
  <!-- 我的工单通过 scope=created/assigned/watching 复用工单查询接口。 -->
  <PageHeader title="我的工单" />
  <FeaturePlaceholder title="我的工单列表" phase="基础骨架" :items="items" />
</template>
