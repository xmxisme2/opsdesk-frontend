<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['请确认登录状态', '请确认角色权限', '请确认功能开关']
</script>

<template>
  <!-- 无权限页由路由守卫进入，接口层仍以后端权限校验为准。 -->
  <PageHeader title="无权限" />
  <FeaturePlaceholder title="当前账号无法访问该页面" phase="403" :items="items" />
</template>
