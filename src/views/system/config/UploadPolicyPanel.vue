<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ArrowLeft, Refresh } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getUploadPolicy, updateUploadPolicy } from '@/api/modules/system'
import PageHeader from '@/components/common/PageHeader.vue'
import type { UploadPolicy } from '@/types/system'

const supportedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'docx', 'xlsx', 'txt', 'log', 'zip']
const safePreviewExtensions = new Set(['jpg', 'jpeg', 'png', 'txt', 'log'])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const router = useRouter()
const form = reactive<UploadPolicy>({ maxFileSizeMb: 20, maxFilesPerTicket: 10, allowedExtensions: [], previewableExtensions: [], downloadOnlyExtensions: [] })

// 上传策略页面与后端文件签名能力使用同一扩展名集合，禁止通过配置开放未经校验的格式。
async function loadPolicy() {
  loading.value = true
  errorMessage.value = ''
  try { Object.assign(form, await getUploadPolicy()) }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '上传策略加载失败' }
  finally { loading.value = false }
}

function toggleAllowed(extension: string, enabled: boolean) {
  if (enabled) {
    form.allowedExtensions = [...new Set([...form.allowedExtensions, extension])]
    if (safePreviewExtensions.has(extension)) form.previewableExtensions = [...new Set([...form.previewableExtensions, extension])]
    else form.downloadOnlyExtensions = [...new Set([...form.downloadOnlyExtensions, extension])]
  } else {
    form.allowedExtensions = form.allowedExtensions.filter(item => item !== extension)
    form.previewableExtensions = form.previewableExtensions.filter(item => item !== extension)
    form.downloadOnlyExtensions = form.downloadOnlyExtensions.filter(item => item !== extension)
  }
}

function setPreviewMode(extension: string, previewable: boolean) {
  if (previewable && !safePreviewExtensions.has(extension)) { ElMessage.warning('该文件类型不支持安全预览'); return }
  form.previewableExtensions = previewable ? [...new Set([...form.previewableExtensions, extension])] : form.previewableExtensions.filter(item => item !== extension)
  form.downloadOnlyExtensions = previewable ? form.downloadOnlyExtensions.filter(item => item !== extension) : [...new Set([...form.downloadOnlyExtensions, extension])]
}

async function savePolicy() {
  if (!form.allowedExtensions.length) { ElMessage.warning('请至少保留一种允许上传的文件类型'); return }
  saving.value = true
  try { Object.assign(form, await updateUploadPolicy(form)); ElMessage.success('上传限制已更新') }
  finally { saving.value = false }
}

onMounted(loadPolicy)
</script>

<template>
  <!-- Figma 仅定义系统配置框架，本页按需求补齐可操作表单，并沿用同一页面面板、间距和按钮层级。 -->
  <section class="page-stack upload-policy-page" v-loading="loading">
    <PageHeader title="上传限制配置" description="统一控制附件大小、数量、允许格式及预览方式">
      <template #actions><el-button :icon="ArrowLeft" @click="router.push('/system/config')">返回系统配置</el-button><el-button :icon="Refresh" @click="loadPolicy">刷新</el-button><el-button type="primary" :loading="saving" @click="savePolicy">保存配置</el-button></template>
    </PageHeader>
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon><template #default><el-button link type="primary" @click="loadPolicy">重新加载</el-button></template></el-alert>
    <section class="page-panel policy-panel">
      <h3>基础限制</h3>
      <div class="limit-grid">
        <label><span>单文件最大大小</span><el-input-number v-model="form.maxFileSizeMb" :min="1" :max="100" /><small>MB，保存后立即作用于新上传</small></label>
        <label><span>单工单最大附件数</span><el-input-number v-model="form.maxFilesPerTicket" :min="1" :max="50" /><small>包含工单及其评论附件</small></label>
      </div>
    </section>
    <section class="page-panel policy-panel">
      <h3>文件类型</h3><p class="hint">仅可启用服务器已支持 MIME 和文件签名校验的格式。</p>
      <div class="extension-list">
        <div v-for="extension in supportedExtensions" :key="extension" class="extension-row">
          <el-checkbox :model-value="form.allowedExtensions.includes(extension)" @change="toggleAllowed(extension, Boolean($event))">.{{ extension }}</el-checkbox>
          <el-radio-group v-if="form.allowedExtensions.includes(extension)" :model-value="form.previewableExtensions.includes(extension)" @change="setPreviewMode(extension, Boolean($event))">
            <el-radio-button :value="true" :disabled="!safePreviewExtensions.has(extension)">可预览</el-radio-button>
            <el-radio-button :value="false">仅下载</el-radio-button>
          </el-radio-group>
          <span v-else class="disabled-text">禁止上传</span>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.upload-policy-page { min-width: 0; }
.policy-panel { padding: 22px 24px; }
.policy-panel h3 { margin: 0 0 8px; color: var(--ops-text-primary); }
.hint, small, .disabled-text { color: var(--ops-text-secondary); }
.limit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-top: 20px; }
.limit-grid label { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px 16px; }
.limit-grid small { grid-column: 1 / -1; }
.extension-list { margin-top: 18px; border-top: 1px solid var(--el-border-color-lighter); }
.extension-row { min-height: 58px; display: grid; grid-template-columns: 160px 1fr; align-items: center; gap: 16px; border-bottom: 1px solid var(--el-border-color-lighter); }
@media (max-width: 720px) { .limit-grid { grid-template-columns: 1fr; } .extension-row { grid-template-columns: 100px 1fr; } }
</style>
