<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['基础信息', '状态流与可用动作', '评论协作', '附件与操作日志']
</script>

<template>
  <!-- 工单详情的状态按钮必须使用后端 availableActions，不在前端硬编码状态流转。 -->
  <PageHeader title="工单详情" />
  <FeaturePlaceholder title="工单详情视图" phase="待接入 Figma Frame 64:175" :items="items" />
</template>
