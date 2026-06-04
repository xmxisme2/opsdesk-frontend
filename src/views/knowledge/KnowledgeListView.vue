<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['文章列表', '分类筛选', '标签筛选', '关键词搜索']
</script>

<template>
  <!-- 知识库为 P2 能力，主流程稳定后再接入完整 CRUD 和全文搜索。 -->
  <PageHeader title="知识库" />
  <FeaturePlaceholder title="知识库列表" phase="P2 预留" :items="items" />
</template>
