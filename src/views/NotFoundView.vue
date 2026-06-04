<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['返回工作台', '检查访问地址', '确认菜单权限']
</script>

<template>
  <!-- 兜底页用于处理未知路由，避免用户看到空白页面。 -->
  <PageHeader title="页面不存在" />
  <FeaturePlaceholder title="未找到对应页面" phase="404" :items="items" />
</template>
