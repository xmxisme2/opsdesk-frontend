<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['部门树', '团队列表', '团队成员', '负责人设置']
</script>

<template>
  <!-- 部门与团队合并在一个路由中承载，满足 Figma 操作场景和需求领域边界。 -->
  <PageHeader title="部门与团队" />
  <FeaturePlaceholder title="组织管理" phase="基础骨架" :items="items" />
</template>
