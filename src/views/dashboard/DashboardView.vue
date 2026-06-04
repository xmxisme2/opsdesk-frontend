<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['总览指标', '趋势图', '分类与优先级分布', '处理人排行和超时列表']
</script>

<template>
  <!-- 数据看板后续使用 ECharts，MANAGER 看本团队，ADMIN 可看全局。 -->
  <PageHeader title="数据看板" />
  <FeaturePlaceholder title="看板统计视图" phase="基础骨架" :items="items" />
</template>
