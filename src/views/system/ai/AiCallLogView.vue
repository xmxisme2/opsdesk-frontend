<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['AI 开关', '调用场景', '成功状态', '失败原因']
</script>

<template>
  <!-- AI 调用日志为后续能力，首版不产生真实调用记录。 -->
  <PageHeader title="AI 调用日志与开关" />
  <FeaturePlaceholder title="AI 调用日志" phase="P3 预留" :items="items" />
</template>
