<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['通知列表', '未读标记', '全部已读', '业务详情跳转']
</script>

<template>
  <!-- 通知中心只展示当前登录用户通知，未读计数由 notification store 承接。 -->
  <PageHeader title="通知中心" />
  <FeaturePlaceholder title="站内通知列表" phase="基础骨架" :items="items" />
</template>
