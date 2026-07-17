<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Document, Paperclip, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadRequestOptions } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { deleteFile, downloadFileBlob, previewFile, previewFileBlob, uploadFile } from '@/api/modules/files'
import { createKnowledgeArticle, deleteKnowledgeArticle, getKnowledgeArticleDetail, getKnowledgeCategoryTree, offlineKnowledgeArticle, publishKnowledgeArticle, searchKnowledgeTags, updateKnowledgeArticle } from '@/api/modules/knowledge'
import MarkdownViewer from '@/components/business/MarkdownViewer.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useAuthStore } from '@/stores/modules/auth'
import { formatDateTime } from '@/utils/format-date'
import type { FilePreviewResult, FileVO } from '@/types/file'
import type { KnowledgeArticleMutation, KnowledgeArticleVO, KnowledgeCategoryVO, KnowledgeTagVO } from '@/types/knowledge'

const route = useRoute(); const router = useRouter(); const authStore = useAuthStore()
const id = computed(() => String(route.params.id)); const isNew = computed(() => id.value === 'new')
const article = ref<KnowledgeArticleVO>(); const categories = ref<KnowledgeCategoryVO[]>([]); const tagOptions = ref<KnowledgeTagVO[]>([])
const attachments = ref<FileVO[]>([]); const pendingAttachmentIds = ref<string[]>([])
const loading = ref(false); const saving = ref(false); const uploading = ref(false); const errorMessage = ref('')
const canMaintain = computed(() => authStore.hasRole(['AGENT', 'MANAGER', 'ADMIN'])); const canManage = computed(() => authStore.hasRole(['MANAGER', 'ADMIN']))
const editing = ref(false); const editorTab = ref<'edit' | 'preview'>('edit'); const tempToken = ref('')
const previewVisible = ref(false); const preview = ref<FilePreviewResult>(); const imagePreviewUrl = ref('')
const form = reactive<KnowledgeArticleMutation>({ title: '', summary: '', content: '', categoryId: undefined, tags: [], sourceTicketId: undefined })

// 对齐 Figma 64:490：左侧阅读区展示安全 Markdown 与附件，维护者在编辑区完成草稿、附件和发布操作。
function fillForm(value: KnowledgeArticleVO) { form.title = value.title; form.summary = value.summary; form.content = value.content; form.categoryId = value.categoryId; form.tags = [...value.tags]; form.sourceTicketId = value.sourceTicketId; attachments.value = [...value.attachments]; pendingAttachmentIds.value = [] }
function ensureTempToken() { if (!tempToken.value) tempToken.value = `knowledge-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; return tempToken.value }
function revokeImagePreview() { if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value); imagePreviewUrl.value = '' }
function fileSize(file: FileVO) { return file.fileSize < 1024 * 1024 ? `${Math.max(1, Math.round(file.fileSize / 1024))} KB` : `${(file.fileSize / 1024 / 1024).toFixed(1)} MB` }

async function load() { if (isNew.value) { if (!canMaintain.value) { router.replace('/knowledge'); return }; editing.value = true; attachments.value = []; return }; loading.value = true; errorMessage.value = ''; try { article.value = await getKnowledgeArticleDetail(id.value); fillForm(article.value) } catch (error) { errorMessage.value = error instanceof Error ? error.message : '文章加载失败' } finally { loading.value = false } }
async function loadOptions() { const [categoryResult, tagResult] = await Promise.all([getKnowledgeCategoryTree(true), searchKnowledgeTags()]); categories.value = categoryResult; tagOptions.value = tagResult }
async function save() { if (!form.title.trim() || !form.content.trim()) { ElMessage.warning('请填写标题和正文'); return }; saving.value = true; try { const payload: KnowledgeArticleMutation = { ...form, attachmentIds: pendingAttachmentIds.value }; const result = isNew.value ? await createKnowledgeArticle(payload) : await updateKnowledgeArticle(id.value, payload); ElMessage.success('文章已保存'); if (isNew.value) await router.replace(`/knowledge/${result.id}`); article.value = result; fillForm(result); editing.value = false } finally { saving.value = false } }
async function publish() { article.value = await publishKnowledgeArticle(id.value); fillForm(article.value); ElMessage.success('文章已发布') }
async function offline() { const { value } = await ElMessageBox.prompt('请输入下线原因', '下线文章', { inputValidator: (input) => Boolean(input.trim()) || '请输入原因' }); article.value = await offlineKnowledgeArticle(id.value, value); fillForm(article.value); ElMessage.success('文章已下线') }
async function remove() { await ElMessageBox.confirm('删除后文章不可恢复，确认继续？', '删除文章', { type: 'warning' }); await deleteKnowledgeArticle(id.value); ElMessage.success('文章已删除'); router.replace('/knowledge') }
async function uploadKnowledgeAttachment(options: UploadRequestOptions) { uploading.value = true; try { const uploaded = await uploadFile({ bizType: 'KNOWLEDGE', tempToken: ensureTempToken(), file: options.file }); attachments.value.push(uploaded); pendingAttachmentIds.value.push(String(uploaded.id)); ElMessage.success('附件已上传，保存文章后完成绑定'); options.onSuccess?.(uploaded) } catch (error) { options.onError?.(error as never) } finally { uploading.value = false } }
async function removeAttachment(file: FileVO) { await deleteFile(file.id, '知识文章编辑时移除附件'); attachments.value = attachments.value.filter(item => item.id !== file.id); pendingAttachmentIds.value = pendingAttachmentIds.value.filter(item => item !== String(file.id)); ElMessage.success('附件已删除') }
async function previewAttachment(file: FileVO) { revokeImagePreview(); preview.value = await previewFile(file.id); if (preview.value.previewType === 'IMAGE') { const blob = await previewFileBlob(file.id); imagePreviewUrl.value = URL.createObjectURL(blob) }; previewVisible.value = true }
async function downloadAttachment(file: FileVO) { const blob = await downloadFileBlob(file.id); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.fileName; link.click(); URL.revokeObjectURL(url) }
onMounted(() => Promise.allSettled([loadOptions(), load()]))
</script>

<template>
  <section class="page-stack knowledge-detail">
    <PageHeader :title="isNew ? '新建知识文章' : article?.title || '知识库详情'" :description="article ? `${article.authorName} · 更新于 ${formatDateTime(article.updatedAt)}` : '沉淀可复用的解决方案'">
      <template #actions>
        <el-button @click="router.push('/knowledge')">返回列表</el-button>
        <el-button v-if="canMaintain && !editing && !isNew" type="primary" @click="editing = true">编辑</el-button>
        <el-button v-if="editing" type="primary" :loading="saving" @click="save">保存草稿</el-button>
        <el-button v-if="canManage && article?.status !== 'PUBLISHED' && !editing" type="success" @click="publish">发布</el-button>
        <el-button v-if="canManage && article?.status === 'PUBLISHED' && !editing" @click="offline">下线</el-button>
        <el-button v-if="canManage && !isNew && !editing" type="danger" plain @click="remove">删除</el-button>
      </template>
    </PageHeader>
    <section v-loading="loading" class="page-panel knowledge-content">
      <ErrorState v-if="errorMessage" :message="errorMessage" @retry="load" />
      <el-form v-else-if="editing" label-position="top" class="editor-form">
        <el-form-item label="文章标题" required><el-input v-model="form.title" maxlength="200" show-word-limit /></el-form-item>
        <el-form-item label="摘要"><el-input v-model="form.summary" type="textarea" :rows="2" maxlength="500" show-word-limit /></el-form-item>
        <div class="editor-grid"><el-form-item label="分类"><el-tree-select v-model="form.categoryId" :data="categories" node-key="id" :props="{ label: 'name', children: 'children' }" check-strictly clearable /></el-form-item><el-form-item label="标签"><el-select v-model="form.tags" multiple filterable allow-create default-first-option><el-option v-for="tag in tagOptions" :key="tag.id" :label="tag.name" :value="tag.name" /></el-select></el-form-item></div>
        <el-form-item label="Markdown 正文" required>
          <el-tabs v-model="editorTab" class="markdown-editor-tabs"><el-tab-pane label="编辑" name="edit"><el-input v-model="form.content" type="textarea" :rows="18" placeholder="# 问题描述&#10;&#10;## 处理步骤" /></el-tab-pane><el-tab-pane label="安全预览" name="preview"><MarkdownViewer :content="form.content" /></el-tab-pane></el-tabs>
        </el-form-item>
        <el-form-item label="附件"><el-upload :show-file-list="false" :http-request="uploadKnowledgeAttachment" :disabled="uploading"><el-button :icon="UploadFilled" :loading="uploading">上传附件</el-button><template #tip><div class="el-upload__tip">单文件最大 20MB；图片和文本可预览，Office、PDF、压缩包直接下载。</div></template></el-upload></el-form-item>
        <ul v-if="attachments.length" class="attachment-list"><li v-for="file in attachments" :key="file.id"><el-icon><Paperclip /></el-icon><span class="attachment-list__name">{{ file.fileName }}</span><span>{{ fileSize(file) }}</span><el-button v-if="file.previewable" link type="primary" @click="previewAttachment(file)">预览</el-button><el-button link type="primary" @click="downloadAttachment(file)">下载</el-button><el-button link type="danger" @click="removeAttachment(file)">删除</el-button></li></ul>
      </el-form>
      <article v-else-if="article" class="article-view">
        <div class="article-meta"><el-tag>{{ article.categoryName || '未分类' }}</el-tag><el-tag v-for="tag in article.tags" :key="tag" effect="plain">{{ tag }}</el-tag><span>{{ article.viewCount }} 次浏览</span><router-link v-if="article.sourceTicketId" :to="`/tickets/${article.sourceTicketId}`">来源工单 {{ article.sourceTicketNo || article.sourceTicketId }}</router-link></div>
        <p v-if="article.summary" class="article-summary">{{ article.summary }}</p><MarkdownViewer :content="article.content" />
        <section class="article-attachments"><h3><el-icon><Paperclip /></el-icon> 附件</h3><p v-if="!attachments.length" class="empty-attachments">暂无附件</p><ul v-else class="attachment-list"><li v-for="file in attachments" :key="file.id"><el-icon><Document /></el-icon><span class="attachment-list__name">{{ file.fileName }}</span><span>{{ fileSize(file) }} · {{ file.uploaderName || '未知上传人' }}</span><el-button v-if="file.previewable" link type="primary" @click="previewAttachment(file)">预览</el-button><el-button link type="primary" @click="downloadAttachment(file)">下载</el-button></li></ul></section>
      </article>
    </section>
    <el-dialog v-model="previewVisible" :title="preview?.fileName || '附件预览'" width="min(760px, 92vw)" @closed="revokeImagePreview"><img v-if="preview?.previewType === 'IMAGE'" :src="imagePreviewUrl" class="image-preview" alt="附件预览"><pre v-else class="text-preview">{{ preview?.content }}</pre><p v-if="preview?.truncated" class="preview-tip">文件较大，仅展示前 1MB 内容。</p></el-dialog>
  </section>
</template>

<style scoped>
.knowledge-content{min-height:560px}.editor-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.markdown-editor-tabs{width:100%;padding:0 12px;border:1px solid #d1d9e3;border-radius:6px}.article-meta{display:flex;align-items:center;flex-wrap:wrap;gap:8px;color:var(--ops-text-secondary);font-size:13px}.article-summary{margin:24px 0;padding:16px;border-left:4px solid #1252ad;background:#f5f8fc;color:#39475a}.article-attachments{margin-top:28px;padding-top:20px;border-top:1px solid #e6ebf2}.article-attachments h3{display:flex;align-items:center;gap:6px;margin:0 0 12px;font-size:15px}.attachment-list{display:grid;gap:8px;margin:10px 0;padding:0;list-style:none}.attachment-list li{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #dbe3ed;border-radius:6px;background:#f8fafc;font-size:13px}.attachment-list__name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#1252ad}.empty-attachments{margin:0;color:var(--ops-text-secondary);font-size:13px}.image-preview{display:block;max-width:100%;max-height:65vh;margin:auto}.text-preview{max-height:60vh;overflow:auto;padding:14px;border-radius:6px;background:#1f2633;color:#e5edf8;white-space:pre-wrap;font:13px/1.6 Consolas,monospace}.preview-tip{color:#9c6500;font-size:13px}@media(max-width:760px){.editor-grid{grid-template-columns:1fr}.attachment-list li{flex-wrap:wrap}}
</style>
