<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['用户查询', '启停用户', '重置密码', '角色绑定']
</script>

<template>
  <!-- 用户管理为 ADMIN 页面，停用用户后后端需要踢出登录会话并记录审计日志。 -->
  <PageHeader title="用户管理" />
  <FeaturePlaceholder title="用户管理列表" phase="基础骨架" :items="items" />
</template>
