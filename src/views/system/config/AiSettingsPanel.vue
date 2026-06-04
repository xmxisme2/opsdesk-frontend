<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['默认关闭', '密钥不回显', '调用前脱敏', '记录调用日志']
</script>

<template>
  <!-- AI 开关当前仅预留，真实 AI 能力不进入 V1.0。 -->
  <PageHeader title="AI 开关" />
  <FeaturePlaceholder title="AI 开关配置" phase="P3 预留" :items="items" />
</template>
