<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ArrowLeft, DocumentAdd, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules, type UploadFile, type UploadFiles, type UploadRequestOptions, type UploadUserFile, type UploadInstance } from 'element-plus'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import {
  createTicket,
  getTicketCategoryTree,
  getTicketDetail,
  submitTicket,
  updateTicket,
  type TicketMutationRequest,
} from '@/api/modules/tickets'
import { getAiTicketPrefill } from '@/api/modules/ai'
import { deleteFile, uploadFile } from '@/api/modules/files'
import PageHeader from '@/components/common/PageHeader.vue'
import { useDictionariesStore } from '@/stores/modules/dictionaries'
import { selectablePriorityOptions } from '@/utils/priority-options'
import type { ApiId } from '@/types/api'
import type { TicketCategoryVO, TicketPriority, TicketVO } from '@/types/ticket'
import type { AiTicketPrefillVO } from '@/types/ai'

type TicketFormModel = {
  title: string
  description: string
  categoryId: ApiId | ''
  priority: TicketPriority | ''
  dueTime: string
  tags: string[]
}

const MAX_FILE_COUNT = 10
const MAX_FILE_SIZE = 20 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'pdf', 'docx', 'xlsx', 'txt', 'log', 'zip'])

const route = useRoute()
const router = useRouter()
const dictionariesStore = useDictionariesStore()
const { ticketPriorityOptions } = storeToRefs(dictionariesStore)
const formRef = ref<FormInstance>()
const categories = ref<TicketCategoryVO[]>([])
const fileList = ref<UploadUserFile[]>([])
const uploadRef = ref<UploadInstance>()
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const existingTicket = ref<TicketVO | null>(null)
const aiPrefill = ref<AiTicketPrefillVO | null>(null)
const ticketAttachmentIds = ref<ApiId[]>([])
const ticketAttachmentTempToken = ref('')

const draftId = computed(() => (typeof route.query.id === 'string' ? route.query.id : undefined))
const prefillId = computed(() => (typeof route.query.prefillId === 'string' ? route.query.prefillId : undefined))
const isEditing = computed(() => Boolean(draftId.value))
// 附件上传尚未结束或失败时禁止提交，确保创建/编辑请求只携带可绑定的临时附件。
const hasUploadingAttachments = computed(() => fileList.value.some((file) => file.status === 'uploading' || file.status === 'ready'))
const hasFailedAttachments = computed(() => fileList.value.some((file) => file.status === 'fail'))
const pageTitle = computed(() => (isEditing.value ? '编辑工单草稿' : '创建工单'))

const form = reactive<TicketFormModel>({
  title: '',
  description: '',
  categoryId: '',
  priority: 'MEDIUM',
  dueTime: '',
  tags: [],
})
// 编辑草稿时允许回显当前已停用优先级，但停用项不可重新选择。
const priorityOptions = computed(() => selectablePriorityOptions(
  ticketPriorityOptions.value,
  isEditing.value && form.priority ? form.priority : undefined,
))

const rules: FormRules<TicketFormModel> = {
  title: [
    { required: true, message: '请输入工单标题', trigger: 'blur' },
    { max: 200, message: '标题不能超过 200 个字符', trigger: 'blur' },
  ],
  description: [{ required: true, message: '请描述问题现象和影响范围', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择工单分类', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
}

async function loadPage() {
  loading.value = true
  try {
    const [categoryResult] = await Promise.all([
      getTicketCategoryTree({ enabled: true }),
      dictionariesStore.loadTicketPriorities(),
    ])
    categories.value = categoryResult
    if (draftId.value) {
      const ticket = await getTicketDetail(draftId.value)
      if (ticket.status !== 'DRAFT') {
        ElMessage.warning('只有草稿状态可以继续编辑')
        router.replace(`/tickets/${ticket.id}`)
        return
      }
      existingTicket.value = ticket
      ticketAttachmentIds.value = []
      fileList.value = ticket.attachments.map((attachment) => ({
        name: attachment.fileName,
        uid: Number(attachment.id),
        status: 'success',
        response: attachment,
      }))
      Object.assign(form, {
        title: ticket.title,
        description: ticket.description,
        categoryId: ticket.categoryId ?? '',
        priority: ticket.priority,
        dueTime: ticket.dueTime ?? '',
        tags: ticket.tags ?? [],
      })
      await nextTick()
      formRef.value?.clearValidate()
    } else if (prefillId.value) {
      // AI 跳转场景不沿用普通新建页的默认优先级，未获得可信建议时必须由用户主动选择。
      form.priority = ''
      try {
        const prefill = await getAiTicketPrefill(prefillId.value)
        const validCategoryIds = new Set(flattenCategoryIds(categories.value))
        const validCategory = Boolean(prefill.categoryId && validCategoryIds.has(prefill.categoryId))
        const validPriority = Boolean(prefill.priority && priorityOptions.value.some((item) => item.code === prefill.priority && item.enabled))
        const missingFields = new Set(prefill.missingFields)
        if (!validCategory) missingFields.add('categoryId')
        if (!validPriority) missingFields.add('priority')
        aiPrefill.value = { ...prefill, missingFields: Array.from(missingFields) }
        Object.assign(form, {
          title: prefill.title,
          description: prefill.description,
          categoryId: validCategory ? prefill.categoryId : '',
          // AI 未达到自动携带阈值时保留空值，让用户在页面明确选择。
          priority: validPriority ? prefill.priority : '',
          tags: prefill.tags ?? [],
        })
        await nextTick()
        formRef.value?.clearValidate()
      } catch (error) {
        ElMessage.warning(error instanceof Error ? error.message : 'AI 预填信息读取失败，请手动填写')
      }
    }
  } finally {
    loading.value = false
  }
}

function validateFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    ElMessage.warning(`不支持 .${extension || '未知'} 文件`)
    return false
  }
  if (file.size > MAX_FILE_SIZE) {
    ElMessage.warning('单个附件不能超过 20MB')
    return false
  }
  return true
}

function handleFileChange(_file: UploadFile, files: UploadFiles) {
  const validFiles = files.filter((item) => !item.raw || validateFile(item.raw))
  fileList.value = validFiles.slice(0, MAX_FILE_COUNT)
  if (validFiles.length > MAX_FILE_COUNT) {
    ElMessage.warning('单个工单最多上传 10 个附件')
  }
}

function buildPayload(): TicketMutationRequest {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    categoryId: form.categoryId as ApiId,
    priority: form.priority as TicketPriority,
    dueTime: form.dueTime || undefined,
    tags: form.tags.map((tag) => tag.trim()).filter(Boolean),
    attachmentIds: ticketAttachmentIds.value,
  }
}

function ensureTicketAttachmentTempToken() {
  if (!ticketAttachmentTempToken.value) {
    ticketAttachmentTempToken.value = `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
  return ticketAttachmentTempToken.value
}

/** 将分类树展开为有效 ID，用于防御分析后分类被停用或删除的情况。 */
function flattenCategoryIds(nodes: TicketCategoryVO[]): ApiId[] {
  return nodes.flatMap((node) => [node.id, ...flattenCategoryIds(node.children ?? [])])
}

async function uploadTicketAttachment(options: UploadRequestOptions) {
  uploading.value = true
  try {
    const attachment = await uploadFile({ bizType: 'TICKET', tempToken: ensureTicketAttachmentTempToken(), file: options.file })
    ticketAttachmentIds.value.push(attachment.id)
    options.onSuccess(attachment)
  } catch (error) {
    ElMessage.warning('附件上传失败，请重试或移除后再保存或提交')
    options.onError(error as never)
  } finally {
    uploading.value = false
  }
}

async function removeTicketAttachment(file: UploadFile) {
  const attachment = file.response as { id?: ApiId } | undefined
  if (!attachment?.id) return
  await deleteFile(attachment.id, '创建或编辑工单时移除附件')
  ticketAttachmentIds.value = ticketAttachmentIds.value.filter((id) => id !== attachment.id)
}

function retryFailedAttachments() {
  fileList.value.forEach((file) => {
    if (file.status === 'fail') file.status = 'ready'
  })
  uploadRef.value?.submit()
}

async function saveTicket(submitNow: boolean) {
  if (hasUploadingAttachments.value) {
    ElMessage.warning('附件正在上传，请等待全部上传完成后再保存或提交')
    return
  }
  if (hasFailedAttachments.value) {
    ElMessage.warning('存在上传失败的附件，请重试或移除后再保存或提交')
    return
  }
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  saving.value = true
  try {
    let ticket: TicketVO
    if (draftId.value) {
      ticket = await updateTicket(draftId.value, buildPayload())
      if (submitNow) {
        ticket = await submitTicket(ticket.id)
      }
    } else {
      ticket = await createTicket({ ...buildPayload(), submitNow })
    }
    ElMessage.success(submitNow ? '工单已提交' : '草稿已保存')
    router.push(submitNow ? `/tickets/${ticket.id}` : { path: '/tickets/create', query: { id: ticket.id } })
  } finally {
    saving.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <section v-loading="loading" class="page-stack ticket-create-page">
    <PageHeader :title="pageTitle" description="填写问题信息，可保存草稿或直接提交进入待分派">
      <template #actions>
        <el-button :icon="ArrowLeft" @click="router.back()">返回</el-button>
      </template>
    </PageHeader>

    <div class="ticket-create-page__layout">
      <section class="page-panel ticket-create-page__form-panel">
        <el-alert
          v-if="aiPrefill"
          class="ticket-create-page__ai-alert"
          :title="aiPrefill.source === 'AI' ? '已根据 AI 会话预填工单信息' : '已带入原始问题，请手动补充工单信息'"
          :description="aiPrefill.missingFields.length ? '分类或优先级未达到自动填写条件，请补充后再提交。' : '请核对预填内容，确认无误后再提交。'"
          type="info"
          :closable="false"
          show-icon
        />
        <h2>问题信息</h2>
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <el-form-item label="标题" prop="title">
            <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="简要描述遇到的问题" />
          </el-form-item>

          <div class="ticket-create-page__form-grid">
            <el-form-item label="分类" prop="categoryId">
              <el-tree-select
                v-model="form.categoryId"
                :data="categories"
                :props="{ value: 'id', label: 'name', children: 'children' }"
                check-strictly
                filterable
                placeholder="请选择分类"
              />
            </el-form-item>
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="form.priority" placeholder="请选择优先级">
                <el-option v-for="item in priorityOptions" :key="item.code" :label="item.name" :value="item.code" :disabled="!item.enabled" />
              </el-select>
            </el-form-item>
            <el-form-item label="期望完成时间">
              <el-date-picker
                v-model="form.dueTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="未填写时按分类 SLA 计算"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="标签">
              <el-select
                v-model="form.tags"
                multiple
                filterable
                allow-create
                default-first-option
                collapse-tags
                :max-collapse-tags="3"
                placeholder="输入后回车创建标签"
              />
            </el-form-item>
          </div>

          <el-form-item label="问题描述" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="8"
              maxlength="5000"
              show-word-limit
              placeholder="说明问题现象、发生时间、影响范围和已经尝试过的处理方式"
            />
          </el-form-item>

          <el-form-item label="附件">
            <el-upload
              ref="uploadRef"
              v-model:file-list="fileList"
              drag
              multiple
              :http-request="uploadTicketAttachment"
              :limit="MAX_FILE_COUNT"
              :on-change="handleFileChange"
              :on-remove="removeTicketAttachment"
              accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx,.txt,.log,.zip"
              class="ticket-create-page__upload"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">拖拽或点击选择截图、日志和文档</div>
              <template #tip>
                <div class="el-upload__tip">单文件最大 20MB，最多 10 个；图片和文本可预览，其余文件提供下载。</div>
              </template>
            </el-upload>
            <el-button v-if="hasFailedAttachments" type="warning" plain size="small" @click="retryFailedAttachments">
              重试失败附件
            </el-button>
          </el-form-item>
        </el-form>

        <div class="ticket-create-page__footer">
          <el-button :loading="saving && !uploading" @click="saveTicket(false)">保存草稿</el-button>
          <el-button type="primary" :icon="DocumentAdd" :loading="saving || uploading" @click="saveTicket(true)">提交工单</el-button>
        </div>
      </section>

      <aside class="page-panel ticket-create-page__aside">
        <div class="ticket-create-page__aside-heading">
          <h2>提交提示</h2>
          <el-tag type="info" round>首版规则</el-tag>
        </div>
        <div class="ticket-create-page__hint">
          <strong>草稿编号</strong>
          <span>保存草稿时不生成编号，提交后由系统统一生成。</span>
        </div>
        <div class="ticket-create-page__hint">
          <strong>默认 SLA</strong>
          <span>未填写期望时间时，系统按所选分类的默认 SLA 自动计算。</span>
        </div>
        <div class="ticket-create-page__hint">
          <strong>附件安全</strong>
          <span>请勿上传密码、密钥或包含敏感个人信息的文件。</span>
        </div>
        <el-alert
          v-if="aiPrefill"
          title="AI 仅负责整理和预填，不会自动创建工单"
          type="info"
          :closable="false"
          show-icon
        />
      </aside>
    </div>
  </section>
</template>

<style scoped>
.ticket-create-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 304px;
  gap: 20px;
  align-items: start;
}

.ticket-create-page h2 {
  margin: 0 0 20px;
  font-size: 18px;
}

.ticket-create-page__form-panel {
  padding: 26px;
}

.ticket-create-page__ai-alert {
  margin-bottom: 20px;
}

.ticket-create-page__form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 28px;
}

.ticket-create-page__upload {
  width: 100%;
}

.ticket-create-page__upload :deep(.el-upload-dragger) {
  padding: 28px 20px;
  background: #f7f9fc;
}

.ticket-create-page__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
}

.ticket-create-page__aside {
  display: grid;
  gap: 16px;
  padding: 24px;
}

.ticket-create-page__aside-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ticket-create-page__aside-heading h2 {
  margin: 0;
}

.ticket-create-page__hint {
  display: grid;
  gap: 8px;
  border: 1px solid var(--ops-border-color);
  border-radius: 8px;
  background: #f4f7fb;
  padding: 16px;
}

.ticket-create-page__hint strong {
  font-size: 13px;
}

.ticket-create-page__hint span {
  color: var(--ops-text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

@media (max-width: 1000px) {
  .ticket-create-page__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .ticket-create-page__form-grid {
    grid-template-columns: 1fr;
  }

  .ticket-create-page__form-panel {
    padding: 18px;
  }
}
</style>
