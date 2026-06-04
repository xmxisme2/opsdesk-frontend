<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['工单分派', '评论提醒', '状态变更', '超时通知']
</script>

<template>
  <!-- 通知模板首版支持站内通知，邮件和实时推送后续增强。 -->
  <PageHeader title="通知模板" />
  <FeaturePlaceholder title="通知模板配置" phase="P2 预留" :items="items" />
</template>
