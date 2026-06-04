<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['Markdown 正文', '来源工单', '附件下载', '复制链接']
</script>

<template>
  <!-- 知识库详情读取已发布文章，未发布内容由后端权限控制。 -->
  <PageHeader title="知识库详情" />
  <FeaturePlaceholder title="知识库文章详情" phase="P2 预留" :items="items" />
</template>
