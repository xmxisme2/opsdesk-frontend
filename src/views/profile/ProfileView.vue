<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['个人资料', '默认头像', '修改密码', '多端踢出']
</script>

<template>
  <!-- 个人中心使用当前用户接口和修改密码接口，密码修改后默认踢出其他会话。 -->
  <PageHeader title="个人中心" />
  <FeaturePlaceholder title="个人资料与安全设置" phase="基础骨架" :items="items" />
</template>
