<script setup lang="ts">
import { ArrowLeft } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import FeaturePlaceholder from '@/components/common/FeaturePlaceholder.vue'

const items = ['与 RAG 同轮开发', '默认关闭', '调用前脱敏', '记录调用日志']
const router = useRouter()
</script>

<template>
  <!-- AI 配置与 RAG 延后到同一轮开发，当前不提供可操作开关。 -->
  <PageHeader title="AI 开关"><template #actions><el-button :icon="ArrowLeft" @click="router.push('/system/config')">返回系统配置</el-button></template></PageHeader>
  <FeaturePlaceholder title="AI 与 RAG 配置" phase="P3 后续" :items="items" />
</template>
