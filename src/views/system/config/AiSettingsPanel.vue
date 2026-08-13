<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowLeft, Connection, Cpu, Document, Lock, Refresh, Warning } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { getAiSettings, updateAiSettings } from '@/api/modules/system'
import PageHeader from '@/components/common/PageHeader.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { usePermissionStore } from '@/stores/modules/permission'
import { formatDateTime } from '@/utils/format-date'
import type { AiSettings } from '@/types/ai'

const router = useRouter()
const permissionStore = usePermissionStore()
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const settings = ref<AiSettings>()
const form = reactive({ enabled: false, ragEnabled: false })

const dirty = computed(() => settings.value
  ? form.enabled !== settings.value.enabled || form.ragEnabled !== settings.value.ragEnabled
  : false)
const effectiveCount = computed(() => Number(settings.value?.effectiveEnabled) + Number(settings.value?.effectiveRagEnabled))

load()

/** 从服务端刷新数据库期望值和部署环境最终状态，页面不缓存敏感配置。 */
async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await getAiSettings()
    applySettings(data)
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'AI 配置加载失败'
  } finally {
    loading.value = false
  }
}

function applySettings(data: AiSettings) {
  settings.value = data
  form.enabled = data.enabled
  form.ragEnabled = data.ragEnabled
  permissionStore.setAiEnabled(data.effectiveEnabled)
}

function handleAiChange(enabled: string | number | boolean) {
  if (!Boolean(enabled)) form.ragEnabled = false
}

/** 关闭 AI 会中断后续新问答，保存前进行二次确认并由后端再次强制关闭 RAG。 */
async function save() {
  if (!settings.value || !dirty.value) return
  if (settings.value.enabled && !form.enabled) {
    try {
      await ElMessageBox.confirm('关闭后，AI 助手和知识问答将立即停止接受新请求，是否继续？', '确认关闭 AI', {
        type: 'warning', confirmButtonText: '确认关闭', cancelButtonText: '取消',
      })
    } catch {
      return
    }
  }
  saving.value = true
  try {
    const data = await updateAiSettings({ enabled: form.enabled, ragEnabled: form.enabled && form.ragEnabled })
    applySettings(data)
    ElMessage.success('AI 开关已更新并立即生效')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- AI 开关只维护非敏感运行状态；模型密钥仍由生产环境文件托管。 -->
  <section class="page-stack ai-settings-page">
    <PageHeader title="AI 开关" description="管理 AI 助手与知识问答运行状态">
      <template #actions>
        <el-button :icon="ArrowLeft" @click="router.push('/system/config')">返回系统配置</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="load">刷新状态</el-button>
        <el-button type="primary" :disabled="!dirty" :loading="saving" @click="save">保存配置</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" title="AI 配置加载失败" :description="error" @retry="load" />
    <template v-else>
      <section v-loading="loading" class="status-hero page-panel">
        <div class="hero-icon"><Cpu /></div>
        <div class="hero-copy">
          <span class="eyebrow">AI RUNTIME</span>
          <h2>{{ settings?.effectiveEnabled ? 'AI 服务已启用' : 'AI 服务已停用' }}</h2>
          <p>数据库开关与部署环境同时允许时才会生效，密钥不会在页面展示或保存。</p>
        </div>
        <div class="hero-status">
          <span class="status-dot" :class="{ active: settings?.effectiveEnabled }" />
          {{ settings?.effectiveEnabled ? '运行中' : '未运行' }}
          <small>{{ effectiveCount }}/2 项生效</small>
        </div>
      </section>

      <el-alert v-if="settings && (!settings.environmentEnabled || !settings.environmentRagEnabled)"
        title="部署环境未完全放行" type="warning" :closable="false" show-icon>
        <template #default>页面可以保存期望状态，但最终启用仍需运维配置 AI_ENABLED 和 AI_RAG_ENABLED 后重启 AI 服务。</template>
      </el-alert>

      <section class="settings-layout">
        <div class="page-panel settings-card">
          <div class="section-heading">
            <div><span class="eyebrow">功能控制</span><h3>运行开关</h3></div>
            <el-tag :type="dirty ? 'warning' : 'success'" effect="light">{{ dirty ? '有未保存修改' : '配置已同步' }}</el-tag>
          </div>

          <div class="setting-row">
            <div class="setting-icon primary"><Connection /></div>
            <div class="setting-copy">
              <strong>AI 总开关</strong>
              <p>控制 AI 助手入口及所有新问答请求。关闭时会自动关闭知识 RAG。</p>
              <span>最终状态：<b :class="settings?.effectiveEnabled ? 'ok' : 'off'">{{ settings?.effectiveEnabled ? '已生效' : '未生效' }}</b></span>
            </div>
            <el-switch v-model="form.enabled" size="large" inline-prompt active-text="开" inactive-text="关"
              :disabled="loading || saving" @change="handleAiChange" />
          </div>

          <div class="setting-row">
            <div class="setting-icon teal"><Document /></div>
            <div class="setting-copy">
              <strong>知识库 RAG</strong>
              <p>启用检索增强问答、引用文章和多轮对话能力，依赖 AI 总开关。</p>
              <span>最终状态：<b :class="settings?.effectiveRagEnabled ? 'ok' : 'off'">{{ settings?.effectiveRagEnabled ? '已生效' : '未生效' }}</b></span>
            </div>
            <el-switch v-model="form.ragEnabled" size="large" inline-prompt active-text="开" inactive-text="关"
              :disabled="loading || saving || !form.enabled" />
          </div>
        </div>

        <aside class="page-panel details-card">
          <div class="section-heading"><div><span class="eyebrow">只读信息</span><h3>服务配置</h3></div><Lock /></div>
          <dl>
            <div><dt>模型供应商</dt><dd>{{ settings?.provider || '—' }}</dd></div>
            <div><dt>模型版本</dt><dd>{{ settings?.model || '—' }}</dd></div>
            <div><dt>环境 AI 放行</dt><dd><el-tag :type="settings?.environmentEnabled ? 'success' : 'danger'" size="small">{{ settings?.environmentEnabled ? '已放行' : '未放行' }}</el-tag></dd></div>
            <div><dt>环境 RAG 放行</dt><dd><el-tag :type="settings?.environmentRagEnabled ? 'success' : 'danger'" size="small">{{ settings?.environmentRagEnabled ? '已放行' : '未放行' }}</el-tag></dd></div>
            <div><dt>最近更新</dt><dd>{{ settings?.updateTime ? formatDateTime(settings.updateTime) : '—' }}</dd></div>
          </dl>
          <div class="security-note"><Warning /><span>API Key、数据库密码和 Service JWT 只保存在服务器私密配置中。</span></div>
        </aside>
      </section>
    </template>
  </section>
</template>

<style scoped>
.ai-settings-page { max-width: 1240px; margin: 0 auto; }
.status-hero { display: flex; align-items: center; gap: 18px; padding: 24px 28px; background: linear-gradient(120deg, #fff 45%, #eef5ff); border: 1px solid #dbe7f8; }
.hero-icon { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 16px; color: #fff; background: linear-gradient(135deg, #2563eb, #4f46e5); box-shadow: 0 10px 24px rgba(37, 99, 235, .22); }
.hero-icon :deep(svg) { width: 27px; height: 27px; }
.hero-copy { flex: 1; min-width: 0; }
.eyebrow { font-size: 11px; letter-spacing: .14em; font-weight: 700; color: #64748b; }
.hero-copy h2, .section-heading h3 { margin: 4px 0 0; color: var(--ops-text-primary); }
.hero-copy p { margin: 7px 0 0; color: var(--ops-text-secondary); }
.hero-status { display: grid; grid-template-columns: auto auto; align-items: center; gap: 5px 8px; font-weight: 700; color: #475569; }
.hero-status small { grid-column: 2; color: #94a3b8; font-weight: 500; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; background: #94a3b8; box-shadow: 0 0 0 5px rgba(148, 163, 184, .12); }
.status-dot.active { background: #10b981; box-shadow: 0 0 0 5px rgba(16, 185, 129, .14); }
.settings-layout { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(280px, .8fr); gap: 18px; }
.settings-card, .details-card { padding: 24px; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
.section-heading :deep(svg) { width: 20px; color: #94a3b8; }
.setting-row { display: grid; grid-template-columns: 48px 1fr auto; align-items: center; gap: 16px; padding: 22px 0; border-bottom: 1px solid #edf1f6; }
.setting-row:last-child { border-bottom: 0; }
.setting-icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 13px; }
.setting-icon :deep(svg) { width: 21px; }
.setting-icon.primary { color: #2563eb; background: #eff6ff; }
.setting-icon.teal { color: #0f9f8f; background: #ecfdf5; }
.setting-copy strong { color: #1e293b; font-size: 15px; }
.setting-copy p { margin: 6px 0; color: #64748b; line-height: 1.55; }
.setting-copy span { color: #94a3b8; font-size: 12px; }
.setting-copy b.ok { color: #059669; }.setting-copy b.off { color: #dc2626; }
dl { margin: 14px 0 0; }
dl div { display: flex; justify-content: space-between; gap: 16px; padding: 13px 0; border-bottom: 1px solid #edf1f6; }
dt { color: #64748b; } dd { margin: 0; color: #1e293b; font-weight: 600; text-align: right; }
.security-note { display: flex; gap: 9px; margin-top: 18px; padding: 13px; border-radius: 10px; background: #fff7ed; color: #9a5b13; font-size: 12px; line-height: 1.55; }
.security-note :deep(svg) { width: 17px; flex: 0 0 auto; }
@media (max-width: 900px) { .settings-layout { grid-template-columns: 1fr; }.status-hero { align-items: flex-start; flex-wrap: wrap; }.hero-status { margin-left: 74px; } }
@media (max-width: 560px) { .setting-row { grid-template-columns: 42px 1fr; }.setting-row > :last-child { grid-column: 2; justify-self: start; }.hero-status { margin-left: 0; } }
</style>
