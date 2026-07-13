<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
const router = useRouter()
const items = [
  { title: 'SLA 规则', description: '分类与优先级响应、解决时限', path: '/system/config/sla-rules', ready: true },
  { title: '上传限制', description: '文件大小、数量和扩展名策略', path: '/system/config/upload-policy', ready: false },
  { title: '通知模板', description: '站内通知模板维护', path: '/system/config/notification-templates', ready: false },
  { title: 'AI 开关', description: '首版保持关闭，仅保留配置入口', path: '/system/config/ai-settings', ready: false },
]
</script>

<template>
  <!-- 系统配置作为配置总入口，具体配置通过子路由或面板承载。 -->
  <section class="page-stack">
    <PageHeader title="系统配置" description="SLA、通知、上传限制和 AI 开关等基础参数维护" />
    <section class="config-grid">
      <button v-for="item in items" :key="item.path" class="page-panel config-card" type="button" @click="router.push(item.path)">
        <span><strong>{{ item.title }}</strong><el-tag :type="item.ready ? 'success' : 'info'" size="small">{{ item.ready ? '已接入' : '后续' }}</el-tag></span>
        <p>{{ item.description }}</p>
      </button>
    </section>
  </section>
</template>

<style scoped>
.config-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.config-card { padding: 20px; text-align: left; cursor: pointer; }
.config-card span { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.config-card strong { font-size: 17px; color: var(--ops-text-primary); }
.config-card p { margin: 10px 0 0; color: var(--ops-text-secondary); }
@media (max-width: 720px) { .config-grid { grid-template-columns: 1fr; } }
</style>
