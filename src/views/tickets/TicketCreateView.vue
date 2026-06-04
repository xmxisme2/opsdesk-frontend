<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['标题、描述、分类、优先级', '期望完成时间', '附件上传进度', '保存草稿或直接提交']
</script>

<template>
  <!-- 创建工单支持 submitNow，一步提交由后端状态机决定目标状态。 -->
  <PageHeader title="创建工单" />
  <FeaturePlaceholder title="工单创建表单" phase="待接入 Figma Frame 64:100" :items="items" />
</template>
