<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['AI 开关关闭时隐藏入口', '后续接入前必须脱敏', '回答必须返回引用来源']
</script>

<template>
  <!-- AI 助手当前只保留预留入口，不接入真实生成能力。 -->
  <PageHeader title="AI 助手" />
  <FeaturePlaceholder title="AI 助手预留" phase="P3 预留" :items="items" />
</template>
