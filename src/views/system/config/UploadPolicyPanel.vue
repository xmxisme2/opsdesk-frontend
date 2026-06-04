<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['单文件 20MB', '单工单 10 个附件', '图片和文本可预览', 'PDF/Office/ZIP 直接下载']
</script>

<template>
  <!-- 上传策略必须与后端强校验保持一致，附件按钮以后端 preview 字段为准。 -->
  <PageHeader title="上传策略" />
  <FeaturePlaceholder title="上传限制配置" phase="P2 预留" :items="items" />
</template>
