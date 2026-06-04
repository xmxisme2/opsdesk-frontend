<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['分类树', '默认处理团队', '默认 SLA', '优先级配置']
</script>

<template>
  <!-- 工单分类和优先级用于创建工单、列表筛选和 SLA 计算。 -->
  <PageHeader title="工单分类与优先级" />
  <FeaturePlaceholder title="分类与优先级配置" phase="基础骨架" :items="items" />
</template>
