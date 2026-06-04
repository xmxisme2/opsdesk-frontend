<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['编号和标题筛选', '状态与优先级标签', '团队与处理人筛选', '分页、空状态和错误重试']
</script>

<template>
  <!-- 工单列表统一通过 api/modules/tickets.ts 查询，页面不直接写 Axios URL。 -->
  <PageHeader title="工单列表">
    <template #actions>
      <el-button type="primary" @click="$router.push('/tickets/create')">创建工单</el-button>
    </template>
  </PageHeader>
  <FeaturePlaceholder title="工单查询列表" phase="基础骨架" :items="items" />
</template>
