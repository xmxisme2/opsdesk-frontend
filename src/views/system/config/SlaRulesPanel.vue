<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['分类', '优先级', '响应时长', '解决时长']
</script>

<template>
  <!-- SLA 规则不追溯历史工单，后端只影响新建或重新计算的工单。 -->
  <PageHeader title="SLA 规则" />
  <FeaturePlaceholder title="SLA 规则配置" phase="P2 预留" :items="items" />
</template>
