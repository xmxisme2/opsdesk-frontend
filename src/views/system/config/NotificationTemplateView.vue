<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { searchNotificationTemplates, updateNotificationTemplate } from '@/api/modules/system'
import PageHeader from '@/components/common/PageHeader.vue'
import type { NotificationTemplateVO } from '@/types/system'

const loading = ref(false), saving = ref(false), errorMessage = ref('')
const templates = ref<NotificationTemplateVO[]>([])
const selectedId = ref('')
const keyword = ref('')
const formRef = ref<FormInstance>()
const form = reactive({ titleTemplate: '', contentTemplate: '', enabled: true })
const selected = computed(() => templates.value.find(item => item.id === selectedId.value))
const filtered = computed(() => { const key = keyword.value.trim().toLowerCase(); return key ? templates.value.filter(item => `${typeName(item.type)} ${item.type} ${item.channel}`.toLowerCase().includes(key)) : templates.value })
const rules: FormRules = { titleTemplate: [{ required: true, message: '请输入标题模板', trigger: 'blur' }, { max: 255, message: '标题不能超过 255 个字符', trigger: 'blur' }], contentTemplate: [{ required: true, message: '请输入正文模板', trigger: 'blur' }, { max: 1000, message: '正文不能超过 1000 个字符', trigger: 'blur' }] }
const names: Record<string, string> = { TICKET_ASSIGNED: '工单分派', TICKET_COMMENTED: '工单评论', TICKET_STATUS_CHANGED: '状态变更', TICKET_OVERDUE: '超时提醒', TICKET_CLOSED: '关闭通知' }
function typeName(type: string) { return names[type] || type }
function channelName(channel: string) { return channel === 'IN_APP' ? '站内' : '邮件' }
function variableLabel(variable: string) { return `{${variable}}` }
async function copyVariable(variable: string) {
  await navigator.clipboard.writeText(variableLabel(variable))
  ElMessage.success('变量已复制')
}
function selectTemplate(item: NotificationTemplateVO) { selectedId.value = item.id; Object.assign(form, { titleTemplate: item.titleTemplate, contentTemplate: item.contentTemplate, enabled: item.enabled }); formRef.value?.clearValidate() }

// 页面严格按模板返回的变量白名单提示管理员，实际保存仍由后端再次校验。
async function loadTemplates() {
  loading.value = true; errorMessage.value = ''
  try { templates.value = await searchNotificationTemplates({}); const current = templates.value.find(item => item.id === selectedId.value) || templates.value[0]; if (current) selectTemplate(current) }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '通知模板加载失败' }
  finally { loading.value = false }
}
async function saveTemplate() {
  if (!selected.value || !(await formRef.value?.validate().catch(() => false))) return
  saving.value = true
  try { const result = await updateNotificationTemplate(selected.value.id, form); const index = templates.value.findIndex(item => item.id === result.id); if (index >= 0) templates.value[index] = result; selectTemplate(result); ElMessage.success('通知模板已保存') }
  finally { saving.value = false }
}
onMounted(loadTemplates)
</script>

<template>
  <!-- 对齐 Figma 65:286 的左侧模板列表与右侧编辑表单；发送测试不在当前 API 契约内，因此不扩展外部发送行为。 -->
  <section class="page-stack template-page" v-loading="loading">
    <PageHeader title="通知模板配置" description="站内通知 P1，邮件和实时推送为增强能力">
      <template #actions><el-input v-model="keyword" clearable placeholder="搜索关键词" class="search-input" /><el-tag>v1.0 + 增强</el-tag><el-button :icon="Refresh" @click="loadTemplates">刷新</el-button></template>
    </PageHeader>
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon><template #default><el-button link type="primary" @click="loadTemplates">重新加载</el-button></template></el-alert>
    <div class="template-layout">
      <section class="page-panel template-list">
        <div class="list-head"><span>类型</span><span>渠道</span><span>状态</span></div>
        <button v-for="item in filtered" :key="item.id" type="button" class="template-row" :class="{ active: item.id === selectedId }" @click="selectTemplate(item)">
          <strong>{{ typeName(item.type) }}</strong><span>{{ channelName(item.channel) }}</span><el-tag :type="item.enabled ? 'success' : 'info'" size="small">{{ item.enabled ? '启用' : '停用' }}</el-tag>
        </button>
        <el-empty v-if="!filtered.length" description="暂无匹配模板" :image-size="70" />
      </section>
      <section class="page-panel template-form">
        <template v-if="selected">
          <h2>{{ typeName(selected.type) }}模板</h2>
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
            <div class="meta-grid"><el-form-item label="模板编码"><el-input :model-value="selected.type" disabled /></el-form-item><el-form-item label="通知渠道"><el-input :model-value="channelName(selected.channel)" disabled /></el-form-item></div>
            <el-form-item label="标题模板" prop="titleTemplate"><el-input v-model="form.titleTemplate" maxlength="255" show-word-limit /></el-form-item>
            <el-form-item label="正文模板" prop="contentTemplate"><el-input v-model="form.contentTemplate" type="textarea" :rows="6" maxlength="1000" show-word-limit /></el-form-item>
            <div class="variables">
              <span class="variables-title">可用变量（点击可复制）：</span>
              <button v-for="variable in selected.allowedVariables" :key="variable" type="button" class="variable-item" @click="copyVariable(variable)">
                <code>{{ variableLabel(variable) }}</code>
                <small>{{ selected.variableDescriptions[variable] || variable }}</small>
              </button>
            </div>
            <el-form-item label="启用状态"><el-switch v-model="form.enabled" inline-prompt active-text="启用" inactive-text="停用" /></el-form-item>
            <el-alert title="通知必须关联业务类型和业务 ID；未读数量由 Redis 缓存并在读状态变化后刷新。" type="info" :closable="false" show-icon />
            <div class="form-actions"><el-button type="primary" :loading="saving" @click="saveTemplate">保存模板</el-button></div>
          </el-form>
        </template>
        <el-empty v-else description="请选择通知模板" />
      </section>
    </div>
  </section>
</template>

<style scoped>
.template-page { min-width: 0; }.search-input { width: 260px; }.template-layout { display: grid; grid-template-columns: 420px minmax(480px, 1fr); gap: 30px; align-items: start; }.template-list,.template-form { min-height: 430px; }.template-list { padding: 0 18px; overflow: hidden; }.list-head,.template-row { display: grid; grid-template-columns: 1.2fr 1fr .8fr; align-items: center; gap: 10px; width: 100%; min-height: 54px; border-bottom: 1px solid var(--el-border-color-lighter); }.list-head { color: var(--ops-text-secondary); font-size: 12px; font-weight: 600; }.template-row { border-left: 0; border-right: 0; border-top: 0; background: transparent; text-align: left; cursor: pointer; color: var(--ops-text-primary); }.template-row strong { color: var(--el-color-primary); }.template-row.active { background: var(--el-color-primary-light-9); }.template-form { padding: 28px 32px; }.template-form h2 { margin: 0 0 24px; }.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }.variables { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: -4px 0 20px; }.variables-title { grid-column: 1 / -1; color: var(--ops-text-secondary); font-size: 13px; }.variable-item { display: flex; flex-direction: column; gap: 4px; padding: 9px 11px; border: 1px solid var(--el-border-color); border-radius: 6px; background: var(--el-fill-color-lighter); text-align: left; cursor: pointer; }.variable-item:hover { border-color: var(--el-color-primary); }.variable-item code { color: var(--el-color-primary); font-weight: 600; }.variable-item small { color: var(--ops-text-secondary); }.form-actions { margin-top: 24px; }@media (max-width: 1000px) { .template-layout { grid-template-columns: 1fr; }.template-list { min-height: auto; } }@media (max-width: 720px) { .meta-grid,.variables { grid-template-columns: 1fr; }.search-input { width: 180px; } }
</style>
