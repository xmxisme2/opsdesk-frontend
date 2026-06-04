<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['SLA 规则', '上传限制', '通知模板', 'AI 开关']
</script>

<template>
  <!-- 系统配置作为配置总入口，具体配置通过子路由或面板承载。 -->
  <PageHeader title="系统配置" />
  <FeaturePlaceholder title="系统配置入口" phase="基础骨架" :items="items" />
</template>
