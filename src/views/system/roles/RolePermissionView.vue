<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['角色维护', '菜单权限', '按钮权限', '接口权限']
</script>

<template>
  <!-- 角色权限页面只负责配置展示，接口权限仍由后端 Spring Security 强校验。 -->
  <PageHeader title="角色权限" />
  <FeaturePlaceholder title="RBAC 配置" phase="基础骨架" :items="items" />
</template>
