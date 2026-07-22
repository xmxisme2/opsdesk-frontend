<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  ArrowLeft,
  ChatDotRound,
  Check,
  Close,
  Connection,
  Delete,
  DocumentAdd,
  Download,
  Edit,
  Paperclip,
  Refresh,
  RefreshRight,
  Select,
  Star,
  StarFilled,
  Switch,
  Upload,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadRequestOptions } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import {
  acceptTicket,
  assignTicket,
  cancelTicket,
  closeTicket,
  completeTicket,
  confirmTicket,
  getTicketDetail,
  rejectTicket,
  reopenTicket,
  searchTicketOperationLogs,
  submitTicket,
  transferTicket,
  unwatchTicket,
  watchTicket,
} from '@/api/modules/tickets'
import { createKnowledgeArticleFromTicket } from '@/api/modules/knowledge'
import { createComment, deleteComment, searchComments } from '@/api/modules/comments'
import { deleteFile, downloadFileBlob, previewFile, previewFileBlob, uploadFile } from '@/api/modules/files'
import { searchTeamMembers, searchTeams } from '@/api/modules/teams'
import PageHeader from '@/components/common/PageHeader.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import PriorityTag from '@/components/business/PriorityTag.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { TICKET_ACTION_LABELS, TICKET_STATUS_LABELS } from '@/constants/ticket'
import { useAuthStore } from '@/stores/modules/auth'
import { formatDateTime } from '@/utils/format-date'
import { formatTicketDueState, resolveTicketActions, usesTeamMemberPicker } from '@/utils/ticket-view'
import type { ApiId } from '@/types/api'
import type { CommentVO } from '@/api/modules/comments'
import type { FileVO } from '@/types/file'
import type { TeamMemberVO, TeamVO } from '@/types/organization'
import type { TicketAction, TicketOperationLogVO, TicketStatus, TicketVO } from '@/types/ticket'

const STATUS_FLOW: { status: TicketStatus; label: string }[] = [
  { status: 'PENDING_ASSIGN', label: '提交 / PENDING_ASSIGN' },
  { status: 'PENDING_PROCESS', label: '分派 / PENDING_PROCESS' },
  { status: 'PROCESSING', label: '接单 / PROCESSING' },
  { status: 'PENDING_CONFIRM', label: '完成 / PENDING_CONFIRM' },
  { status: 'COMPLETED', label: '确认 / COMPLETED' },
  { status: 'CLOSED', label: '关闭 / CLOSED' },
]

const OPERATION_LABELS: Record<string, string> = {
  TICKET_CREATE: '创建工单',
  TICKET_UPDATE: '编辑草稿',
  TICKET_SUBMIT: '提交工单',
  TICKET_ASSIGN: '分派工单',
  TICKET_REJECT: '驳回工单',
  TICKET_ACCEPT: '接单',
  TICKET_TRANSFER: '转派工单',
  TICKET_COMPLETE: '提交完成',
  TICKET_CONFIRM: '确认完成',
  TICKET_REOPEN: '重新打开',
  TICKET_CLOSE: '关闭工单',
  TICKET_CANCEL: '取消工单',
  TICKET_WATCH: '关注工单',
  TICKET_UNWATCH: '取消关注',
  COMMENT_CREATE: '工单评论',
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const ticketId = computed(() => String(route.params.id))
const loading = ref(false)
const error = ref('')
const ticket = ref<TicketVO | null>(null)
const logs = ref<TicketOperationLogVO[]>([])
const logsLoading = ref(false)
const comments = ref<CommentVO[]>([])
const commentsLoading = ref(false)
const commentsPage = ref(1)
const commentsSize = ref(10)
const commentsTotal = ref(0)
const commentSubmitting = ref(false)
const commentUploadLoading = ref(false)
const teams = ref<TeamVO[]>([])
const teamsLoading = ref(false)
const teamMembers = ref<TeamMemberVO[]>([])
const teamMembersLoading = ref(false)
const actionDialogVisible = ref(false)
const actionLoading = ref(false)
const activeAction = ref<TicketAction>('submit')
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewTitle = ref('')
const previewContent = ref('')
const previewImageUrl = ref('')
const knowledgeDraftDialogVisible = ref(false)
const knowledgeDraftLoading = ref(false)

const actionForm = reactive({
  teamId: undefined as ApiId | undefined,
  assigneeId: '',
  reason: '',
  remark: '',
  resolutionSummary: '',
  resolutionSteps: '',
  resolutionVerified: true,
  completionTempToken: '',
  completionFiles: [] as FileVO[],
})

const commentForm = reactive({
  content: '',
  internal: false,
  tempToken: '',
  files: [] as FileVO[],
})
const knowledgeDraftOptions = reactive({
  includeComments: true,
  includeAttachments: true,
})

const availableActions = computed(() => (ticket.value ? resolveTicketActions(ticket.value, authStore.currentUser) : []))
const dueState = computed(() => formatTicketDueState(ticket.value?.dueTime, ticket.value?.overdue, ticket.value?.status))
const currentFlowIndex = computed(() => STATUS_FLOW.findIndex((item) => item.status === ticket.value?.status))
const dialogTitle = computed(() => TICKET_ACTION_LABELS[activeAction.value])
const needsTeam = computed(() => usesTeamMemberPicker(activeAction.value))
const needsReason = computed(() => ['reject', 'reopen', 'cancel'].includes(activeAction.value))
const optionalReason = computed(() => activeAction.value === 'close')
const needsRemark = computed(() => activeAction.value === 'complete')
const optionalComment = computed(() => activeAction.value === 'confirm')
// 仅终态工单允许沉淀为知识草稿，入口与后端 AGENT+ 权限保持一致。
const canCreateKnowledgeDraft = computed(() => {
  const currentTicket = ticket.value
  if (!currentTicket) {
    return false
  }
  return ['COMPLETED', 'CLOSED'].includes(currentTicket.status)
    && authStore.hasRole(['AGENT', 'MANAGER', 'ADMIN'])
})

async function loadTicket() {
  loading.value = true
  error.value = ''
  try {
    ticket.value = await getTicketDetail(ticketId.value)
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '工单详情加载失败'
  } finally {
    loading.value = false
  }
}

function openKnowledgeDraftDialog() {
  knowledgeDraftOptions.includeComments = true
  knowledgeDraftOptions.includeAttachments = true
  knowledgeDraftDialogVisible.value = true
}

async function createKnowledgeDraftFromTicket() {
  if (!ticket.value) return
  knowledgeDraftLoading.value = true
  try {
    const article = await createKnowledgeArticleFromTicket(ticket.value.id, knowledgeDraftOptions)
    knowledgeDraftDialogVisible.value = false
    ElMessage.success('知识草稿已生成')
    await router.push(`/knowledge/${article.id}`)
  } finally {
    knowledgeDraftLoading.value = false
  }
}

async function loadLogs() {
  logsLoading.value = true
  try {
    const result = await searchTicketOperationLogs(ticketId.value, { page: 1, size: 100 })
    logs.value = result.records
  } finally {
    logsLoading.value = false
  }
}

async function loadComments() {
  commentsLoading.value = true
  try {
    const result = await searchComments(ticketId.value, {
      page: commentsPage.value,
      size: commentsSize.value,
    })
    comments.value = result.records
    commentsPage.value = result.page
    commentsSize.value = result.size
    commentsTotal.value = result.total
  } finally {
    commentsLoading.value = false
  }
}

async function loadTeams(keyword = '') {
  teamsLoading.value = true
  try {
    const result = await searchTeams({ page: 1, size: 100, enabled: true, keyword: keyword.trim() || undefined })
    teams.value = result.records
  } catch {
    teams.value = []
  } finally {
    teamsLoading.value = false
  }
}

async function loadTeamMembers(keyword = '') {
  if (!actionForm.teamId) {
    teamMembers.value = []
    return
  }
  teamMembersLoading.value = true
  try {
    const result = await searchTeamMembers(actionForm.teamId, {
      page: 1,
      size: 50,
      keyword: keyword.trim() || undefined,
    })
    teamMembers.value = result.records
  } catch {
    teamMembers.value = []
  } finally {
    teamMembersLoading.value = false
  }
}

async function refreshPage() {
  await Promise.allSettled([loadTicket(), loadLogs(), loadTeams(), loadComments()])
}

function resetActionForm(action: TicketAction) {
  Object.assign(actionForm, {
    teamId: ticket.value?.teamId,
    assigneeId: ticket.value?.assigneeId ?? '',
    reason: '',
    remark: '',
    resolutionSummary: '',
    resolutionSteps: '',
    resolutionVerified: true,
    completionTempToken: '',
    completionFiles: [],
  })
  if (usesTeamMemberPicker(action) && actionForm.teamId) {
    void loadTeamMembers()
  } else {
    teamMembers.value = []
  }
}

function handleTeamChange() {
  actionForm.assigneeId = ''
  void loadTeamMembers()
}

function memberLabel(member: TeamMemberVO) {
  const user = member.user
  const name = user.nickname || user.username || user.phone || user.id
  return `${name}${user.phone ? ` / ${user.phone}` : ''}${member.leader ? ' / 负责人' : ''}`
}

async function openAction(action: TicketAction) {
  activeAction.value = action
  resetActionForm(action)
  if (action === 'submit' || action === 'accept') {
    const confirmed = await ElMessageBox.confirm(`确认${TICKET_ACTION_LABELS[action]}？`, TICKET_ACTION_LABELS[action], {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    }).catch(() => false)
    if (confirmed) {
      await executeAction()
    }
    return
  }
  actionDialogVisible.value = true
}

async function executeAction() {
  if (!ticket.value) {
    return
  }
  if (needsTeam.value && !actionForm.teamId && !actionForm.assigneeId.trim()) {
    ElMessage.warning('请选择处理团队，处理人可从团队人员列表中选择')
    return
  }
  if (needsReason.value && !actionForm.reason.trim()) {
    ElMessage.warning(`请填写${dialogTitle.value}原因`)
    return
  }
  if (needsRemark.value && (!actionForm.resolutionSummary.trim() || !actionForm.resolutionSteps.trim())) {
    ElMessage.warning('请填写解决方案摘要和处理步骤')
    return
  }

  actionLoading.value = true
  try {
    const id = ticket.value.id
    switch (activeAction.value) {
      case 'submit':
        await submitTicket(id)
        break
      case 'assign':
        await assignTicket(id, {
          teamId: actionForm.teamId,
          assigneeId: actionForm.assigneeId.trim() || undefined,
          reason: actionForm.reason.trim() || undefined,
        })
        break
      case 'reject':
        await rejectTicket(id, actionForm.reason.trim())
        break
      case 'accept':
        await acceptTicket(id)
        break
      case 'transfer':
        await transferTicket(id, {
          targetTeamId: actionForm.teamId,
          targetAssigneeId: actionForm.assigneeId.trim() || undefined,
          reason: actionForm.reason.trim(),
        })
        break
      case 'complete':
        await completeTicket(id, {
          resolutionSummary: actionForm.resolutionSummary.trim(),
          resolutionSteps: actionForm.resolutionSteps.trim(),
          resolutionVerified: actionForm.resolutionVerified,
          attachmentIds: actionForm.completionFiles.map((file) => file.id),
        })
        break
      case 'confirm':
        await confirmTicket(id, actionForm.remark.trim() || undefined)
        break
      case 'reopen':
        await reopenTicket(id, actionForm.reason.trim())
        break
      case 'close':
        await closeTicket(id, actionForm.reason.trim() || undefined)
        break
      case 'cancel':
        await cancelTicket(id, actionForm.reason.trim())
        break
    }
    ElMessage.success(`${dialogTitle.value}成功`)
    actionDialogVisible.value = false
    await Promise.all([loadTicket(), loadLogs()])
  } finally {
    actionLoading.value = false
  }
}

async function toggleWatch() {
  if (!ticket.value) {
    return
  }
  if (ticket.value.watching) {
    await unwatchTicket(ticket.value.id)
    ticket.value.watching = false
    ElMessage.success('已取消关注')
  } else {
    await watchTicket(ticket.value.id)
    ticket.value.watching = true
    ElMessage.success('已关注工单')
  }
  await loadLogs()
}

async function submitComment() {
  const content = commentForm.content.trim()
  if (!content) {
    ElMessage.warning('请输入评论内容')
    return
  }
  commentSubmitting.value = true
  try {
    await createComment(ticketId.value, {
      content,
      commentType: commentForm.internal ? 'INTERNAL' : 'PUBLIC',
      tempToken: commentForm.files.length ? commentForm.tempToken : undefined,
    })
    ElMessage.success('评论已发布')
    resetCommentForm()
    commentsPage.value = 1
    await Promise.all([loadComments(), loadLogs()])
  } finally {
    commentSubmitting.value = false
  }
}

async function removeComment(comment: CommentVO) {
  const confirmed = await ElMessageBox.confirm('确认删除这条评论？', '删除评论', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).catch(() => false)
  if (!confirmed) {
    return
  }
  await deleteComment(comment.id)
  ElMessage.success('评论已删除')
  await Promise.all([loadComments(), loadLogs()])
}

async function uploadCommentAttachment(options: UploadRequestOptions) {
  commentUploadLoading.value = true
  try {
    const file = await uploadFile({
      bizType: 'COMMENT',
      tempToken: ensureCommentTempToken(),
      file: options.file,
    })
    commentForm.files.push(file)
    options.onSuccess(file)
    ElMessage.success('附件已上传')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '附件上传失败')
    throw error
  } finally {
    commentUploadLoading.value = false
  }
}

async function removeCommentAttachment(file: FileVO) {
  await deleteFile(file.id)
  commentForm.files = commentForm.files.filter((item) => item.id !== file.id)
  ElMessage.success('附件已移除')
}

/** 完成工单前先上传为临时附件，确认完成时由后端校验归属后统一绑定。 */
async function uploadCompletionAttachment(options: UploadRequestOptions) {
  try {
    const file = await uploadFile({
      bizType: 'TICKET',
      tempToken: ensureCompletionTempToken(),
      file: options.file,
    })
    actionForm.completionFiles.push(file)
    options.onSuccess(file)
    ElMessage.success('完成附件已上传')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '完成附件上传失败')
    options.onError(error as never)
  }
}

async function removeCompletionAttachment(file: FileVO) {
  await deleteFile(file.id, '移除完成工单附件')
  actionForm.completionFiles = actionForm.completionFiles.filter((item) => item.id !== file.id)
}

function ensureCompletionTempToken() {
  if (!actionForm.completionTempToken) {
    actionForm.completionTempToken = `ticket-complete-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
  return actionForm.completionTempToken
}

function resetCommentForm() {
  Object.assign(commentForm, {
    content: '',
    internal: false,
    tempToken: '',
    files: [],
  })
}

function ensureCommentTempToken() {
  if (!commentForm.tempToken) {
    commentForm.tempToken = `comment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
  return commentForm.tempToken
}

function canDeleteComment(comment: CommentVO) {
  const currentUserId = authStore.currentUser?.id
  const admin = authStore.currentUser?.roles?.some((role) => role.code === 'ADMIN')
  return Boolean(currentUserId && (comment.authorId === currentUserId || admin))
}

function updateCommentsPage(value: number) {
  commentsPage.value = value
  void loadComments()
}

function updateCommentsSize(value: number) {
  commentsPage.value = 1
  commentsSize.value = value
  void loadComments()
}

function actionType(action: TicketAction) {
  if (action === 'reject' || action === 'cancel') {
    return 'danger'
  }
  if (['assign', 'accept', 'complete', 'confirm', 'submit'].includes(action)) {
    return 'primary'
  }
  return 'default'
}

function actionIcon(action: TicketAction) {
  const icons: Partial<Record<TicketAction, typeof Check>> = {
    submit: Upload,
    assign: Connection,
    reject: Close,
    accept: Select,
    transfer: Switch,
    complete: Check,
    confirm: Check,
    reopen: RefreshRight,
    close: Close,
    cancel: Close,
  }
  return icons[action]
}

function flowState(index: number) {
  if (ticket.value?.status === 'CANCELLED') {
    return 'waiting'
  }
  if (index < currentFlowIndex.value) {
    return 'completed'
  }
  if (index === currentFlowIndex.value) {
    return 'current'
  }
  return 'waiting'
}

function operationLabel(operationType: string) {
  return OPERATION_LABELS[operationType] ?? operationType.replace(/^TICKET_/, '').replaceAll('_', ' ')
}

async function openPreview(file: FileVO) {
  if (!file.previewable || file.downloadOnly) {
    return
  }
  previewVisible.value = true
  previewLoading.value = true
  previewTitle.value = file.fileName
  previewContent.value = ''
  clearPreviewImageUrl()
  try {
    const result = await previewFile(file.id)
    if (result.previewType === 'IMAGE') {
      const blob = await previewFileBlob(file.id)
      previewImageUrl.value = URL.createObjectURL(blob)
    } else {
      previewContent.value = result.content ?? ''
    }
  } finally {
    previewLoading.value = false
  }
}

async function downloadFile(file: FileVO) {
  const blob = await downloadFileBlob(file.id)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.fileName || '附件'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function clearPreviewImageUrl() {
  if (previewImageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewImageUrl.value)
  }
  previewImageUrl.value = ''
}

onMounted(refreshPage)
onBeforeUnmount(clearPreviewImageUrl)
</script>

<template>
  <section class="page-stack ticket-detail-page">
    <PageHeader
      :title="ticket?.ticketNo || '工单草稿'"
      :description="ticket?.title || '加载工单详情'"
    >
      <template #actions>
        <el-button :icon="ArrowLeft" @click="router.back()">返回</el-button>
        <el-button :icon="Refresh" @click="refreshPage">刷新</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" @retry="refreshPage" />

    <div v-else-if="ticket" v-loading="loading" class="ticket-detail-page__layout">
      <section class="page-panel ticket-detail-page__main">
        <div class="ticket-detail-page__title-row">
          <div>
            <h2>{{ ticket.title }}</h2>
            <div class="ticket-detail-page__tags">
              <StatusTag :status="ticket.status" />
              <PriorityTag :priority="ticket.priority" />
              <el-tag v-if="dueState.tone === 'danger'" type="danger">已超时</el-tag>
              <el-tag v-for="tag in ticket.tags" :key="tag" type="info">{{ tag }}</el-tag>
            </div>
          </div>
          <div class="ticket-detail-page__title-actions">
            <el-button
              :icon="ticket.watching ? StarFilled : Star"
              @click="toggleWatch"
            >
              {{ ticket.watching ? '取消关注' : '关注工单' }}
            </el-button>
            <el-button
              v-if="ticket.status === 'DRAFT' && ticket.creatorId === authStore.currentUser?.id"
              :icon="Edit"
              type="primary"
              @click="router.push({ path: '/tickets/create', query: { id: ticket.id } })"
            >
              编辑草稿
            </el-button>
          </div>
        </div>

        <dl class="ticket-detail-page__info-grid">
          <div><dt>提交人</dt><dd>{{ ticket.creatorName || '-' }}</dd></div>
          <div><dt>分类</dt><dd>{{ ticket.categoryName || '-' }}</dd></div>
          <div><dt>所属团队</dt><dd>{{ ticket.teamName || '未分派' }}</dd></div>
          <div><dt>处理人</dt><dd>{{ ticket.assigneeName || '未分派' }}</dd></div>
          <div><dt>截止时间</dt><dd :class="`ticket-detail-page__due--${dueState.tone}`">{{ formatDateTime(ticket.dueTime) }} · {{ dueState.label }}</dd></div>
          <div><dt>创建时间</dt><dd>{{ formatDateTime(ticket.createdAt) }}</dd></div>
        </dl>

        <section class="ticket-detail-page__section">
          <h3>问题描述</h3>
          <p class="ticket-detail-page__description">{{ ticket.description }}</p>
        </section>

        <section v-if="ticket.resolutionSummary || ticket.resolutionSteps" class="ticket-detail-page__section">
          <div class="ticket-detail-page__section-heading">
            <h3>解决方案</h3>
            <el-tag :type="ticket.resolutionVerified ? 'success' : 'warning'">
              {{ ticket.resolutionVerified ? '已验证' : '待验证' }}
            </el-tag>
          </div>
          <p v-if="ticket.resolutionSummary" class="ticket-detail-page__solution-summary">{{ ticket.resolutionSummary }}</p>
          <div v-if="ticket.resolutionSteps" class="ticket-detail-page__solution-steps">
            <strong>处理步骤</strong>
            <p>{{ ticket.resolutionSteps }}</p>
          </div>
        </section>

        <section class="ticket-detail-page__section">
          <div class="ticket-detail-page__section-heading">
            <h3>附件</h3>
            <span>{{ ticket.attachments?.length || 0 }} 个文件</span>
          </div>
          <EmptyState v-if="!ticket.attachments?.length" message="暂无附件" />
          <ul v-else class="ticket-detail-page__attachments">
            <li v-for="file in ticket.attachments" :key="file.id">
              <div>
                <strong>{{ file.fileName }}</strong>
                <span>{{ Math.max(1, Math.round(file.fileSize / 1024)) }} KB · {{ file.uploaderName || '未知上传人' }}</span>
              </div>
              <div>
                <el-button v-if="file.previewable && !file.downloadOnly" text type="primary" @click="openPreview(file)">预览</el-button>
                <el-button :icon="Download" text type="primary" @click="downloadFile(file)">下载</el-button>
              </div>
            </li>
          </ul>
        </section>

        <section v-loading="commentsLoading" class="ticket-detail-page__section">
          <div class="ticket-detail-page__section-heading">
            <h3>评论</h3>
            <span>{{ commentsTotal }} 条记录</span>
          </div>
          <EmptyState v-if="!comments.length" message="暂无评论" />
          <ul v-else class="ticket-detail-page__comments">
            <li
              v-for="comment in comments"
              :key="comment.id"
              :class="{ 'is-internal': comment.commentType === 'INTERNAL' }"
            >
              <div class="ticket-detail-page__comment-head">
                <div>
                  <strong>{{ comment.authorName || '未知用户' }}</strong>
                  <span>{{ formatDateTime(comment.createdAt) }}</span>
                </div>
                <div class="ticket-detail-page__comment-actions">
                  <el-tag v-if="comment.commentType === 'INTERNAL'" type="warning">内部备注</el-tag>
                  <el-button
                    v-if="canDeleteComment(comment)"
                    :icon="Delete"
                    text
                    type="danger"
                    @click="removeComment(comment)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
              <p>{{ comment.deleted ? '评论已删除' : comment.content }}</p>
              <div v-if="comment.attachments?.length" class="ticket-detail-page__comment-files">
                <el-button
                  v-for="file in comment.attachments"
                  :key="file.id"
                  :icon="Paperclip"
                  text
                  type="primary"
                  @click="file.previewable && !file.downloadOnly ? openPreview(file) : downloadFile(file)"
                >
                  {{ file.fileName }}
                </el-button>
              </div>
            </li>
          </ul>
          <PaginationBar
            v-if="commentsTotal > commentsSize"
            :page="commentsPage"
            :size="commentsSize"
            :total="commentsTotal"
            @update:page="updateCommentsPage"
            @update:size="updateCommentsSize"
          />

          <div class="ticket-detail-page__comment-editor">
            <el-input
              v-model="commentForm.content"
              type="textarea"
              :rows="4"
              maxlength="5000"
              show-word-limit
              placeholder="输入评论内容"
            />
            <div class="ticket-detail-page__comment-toolbar">
              <el-checkbox v-model="commentForm.internal">内部备注</el-checkbox>
              <el-upload
                :show-file-list="false"
                :http-request="uploadCommentAttachment"
                :disabled="commentUploadLoading"
              >
                <el-button :icon="Paperclip" :loading="commentUploadLoading">上传附件</el-button>
              </el-upload>
              <el-button
                :icon="ChatDotRound"
                type="primary"
                :loading="commentSubmitting"
                @click="submitComment"
              >
                发布评论
              </el-button>
            </div>
            <div v-if="commentForm.files.length" class="ticket-detail-page__comment-uploaded">
              <el-tag
                v-for="file in commentForm.files"
                :key="file.id"
                closable
                @close="removeCommentAttachment(file)"
              >
                {{ file.fileName }}
              </el-tag>
            </div>
          </div>
        </section>

        <section v-loading="logsLoading" class="ticket-detail-page__section">
          <div class="ticket-detail-page__section-heading">
            <h3>操作日志</h3>
            <span>按时间倒序</span>
          </div>
          <EmptyState v-if="!logs.length" message="暂无操作记录" />
          <el-timeline v-else>
            <el-timeline-item v-for="log in logs" :key="log.id" :timestamp="formatDateTime(log.createdAt)">
              <strong>{{ operationLabel(log.operationType) }}</strong>
              <p>{{ log.operatorName || '系统' }} · {{ log.content || `${log.fromStatus || '-'} → ${log.toStatus || '-'}` }}</p>
            </el-timeline-item>
          </el-timeline>
        </section>
      </section>

      <aside class="page-panel ticket-detail-page__aside">
        <h2>状态流转</h2>
        <ol class="ticket-detail-page__flow">
          <li v-if="ticket.status === 'DRAFT'" class="is-current">草稿 / DRAFT</li>
          <li v-for="(item, index) in STATUS_FLOW" :key="item.status" :class="`is-${flowState(index)}`">
            {{ item.label }}
          </li>
          <li v-if="ticket.status === 'CANCELLED'" class="is-cancelled">取消 / CANCELLED</li>
        </ol>

        <section class="ticket-detail-page__actions">
          <h3>可用动作</h3>
          <div v-if="availableActions.length" class="ticket-detail-page__action-grid">
            <el-button
              v-for="action in availableActions"
              :key="action"
              :type="actionType(action)"
              :icon="actionIcon(action)"
              @click="openAction(action)"
            >
              {{ TICKET_ACTION_LABELS[action] }}
            </el-button>
          </div>
          <EmptyState v-else message="当前状态没有可执行动作" />
        </section>

        <section v-if="canCreateKnowledgeDraft" class="ticket-detail-page__actions">
          <h3>知识沉淀</h3>
          <el-button :icon="DocumentAdd" type="primary" plain @click="openKnowledgeDraftDialog">
            生成知识草稿
          </el-button>
        </section>

        <el-alert
          :title="`当前状态：${TICKET_STATUS_LABELS[ticket.status]}`"
          description="按钮按后端 availableActions 展示；字段缺失时不展示动作，提交后仍由后端做最终校验。"
          type="warning"
          :closable="false"
          show-icon
        />
      </aside>
    </div>

    <el-dialog v-model="actionDialogVisible" :title="dialogTitle" width="520px">
      <el-form label-position="top">
        <template v-if="needsTeam">
          <el-form-item label="处理团队">
            <el-select
              v-model="actionForm.teamId"
              clearable
              filterable
              remote
              reserve-keyword
              :loading="teamsLoading"
              placeholder="请选择或搜索团队"
              :remote-method="loadTeams"
              @change="handleTeamChange"
            >
              <el-option v-for="team in teams" :key="team.id" :label="team.name" :value="team.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="团队人员列表（可选）">
            <el-select
              v-model="actionForm.assigneeId"
              clearable
              filterable
              remote
              reserve-keyword
              :disabled="!actionForm.teamId"
              :loading="teamMembersLoading"
              placeholder="可按姓名、用户名或手机号搜索"
              :remote-method="loadTeamMembers"
            >
              <el-option
                v-for="member in teamMembers"
                :key="member.user.id"
                :label="memberLabel(member)"
                :value="member.user.id"
              />
            </el-select>
          </el-form-item>
        </template>
        <el-form-item v-if="needsReason || optionalReason || activeAction === 'transfer'" :label="needsReason || activeAction === 'transfer' ? '原因' : '备注（可选）'">
          <el-input v-model="actionForm.reason" type="textarea" :rows="4" maxlength="500" show-word-limit />
        </el-form-item>
        <template v-if="needsRemark">
          <el-form-item label="完成附件（可选）">
            <el-upload :show-file-list="false" :http-request="uploadCompletionAttachment">
              <el-button :icon="Paperclip">上传附件</el-button>
            </el-upload>
            <div v-if="actionForm.completionFiles.length" class="ticket-detail-page__comment-uploaded">
              <el-tag v-for="file in actionForm.completionFiles" :key="file.id" closable @close="removeCompletionAttachment(file)">
                {{ file.fileName }}
              </el-tag>
            </div>
          </el-form-item>
          <el-form-item label="解决方案摘要" required>
            <el-input
              v-model="actionForm.resolutionSummary"
              type="textarea"
              :rows="3"
              maxlength="1000"
              show-word-limit
              placeholder="说明问题根因和最终处理结论"
            />
          </el-form-item>
          <el-form-item label="处理步骤" required>
            <el-input
              v-model="actionForm.resolutionSteps"
              type="textarea"
              :rows="6"
              maxlength="10000"
              show-word-limit
              placeholder="按顺序记录可复用的处理操作，可使用 Markdown"
            />
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="actionForm.resolutionVerified">已验证问题已解决</el-checkbox>
          </el-form-item>
        </template>
        <el-form-item v-else-if="optionalComment" label="确认备注（可选）">
          <el-input v-model="actionForm.remark" type="textarea" :rows="4" maxlength="1000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="actionDialogVisible = false">取消</el-button>
        <el-button :type="actionType(activeAction)" :loading="actionLoading" @click="executeAction">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="knowledgeDraftDialogVisible" title="生成知识草稿" width="460px">
      <p class="ticket-detail-page__knowledge-hint">将根据当前终态工单生成可编辑草稿，来源工单保持不变。</p>
      <div class="ticket-detail-page__knowledge-options">
        <el-checkbox v-model="knowledgeDraftOptions.includeComments">带入公开评论</el-checkbox>
        <el-checkbox v-model="knowledgeDraftOptions.includeAttachments">复制工单附件</el-checkbox>
      </div>
      <template #footer>
        <el-button :disabled="knowledgeDraftLoading" @click="knowledgeDraftDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="knowledgeDraftLoading" @click="createKnowledgeDraftFromTicket">生成并编辑</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="previewVisible" :title="previewTitle" width="760px">
      <div v-loading="previewLoading" class="ticket-detail-page__preview">
        <el-image v-if="previewImageUrl" :src="previewImageUrl" fit="contain" />
        <pre v-else>{{ previewContent }}</pre>
      </div>
    </el-dialog>
  </section>
</template>

<style scoped>
.ticket-detail-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 322px;
  gap: 20px;
  align-items: start;
}

.ticket-detail-page__main {
  display: grid;
  gap: 28px;
  padding: 26px;
}

.ticket-detail-page__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.ticket-detail-page__title-row h2,
.ticket-detail-page__aside h2 {
  margin: 0;
  font-size: 20px;
}

.ticket-detail-page__tags,
.ticket-detail-page__title-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.ticket-detail-page__title-actions {
  justify-content: flex-end;
  margin-top: 0;
}

.ticket-detail-page__info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 36px;
  margin: 0;
}

.ticket-detail-page__info-grid div {
  min-width: 0;
}

.ticket-detail-page__info-grid dt {
  margin-bottom: 7px;
  color: var(--ops-text-secondary);
  font-size: 12px;
}

.ticket-detail-page__info-grid dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.ticket-detail-page__due--danger {
  color: var(--ops-danger-color);
}

.ticket-detail-page__due--warning {
  color: #b26a00;
}

.ticket-detail-page__section {
  border-top: 1px solid var(--ops-border-color);
  padding-top: 24px;
}

.ticket-detail-page__section h3 {
  margin: 0 0 14px;
  font-size: 16px;
}

.ticket-detail-page__section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ticket-detail-page__section-heading span {
  color: var(--ops-text-secondary);
  font-size: 12px;
}

.ticket-detail-page__description {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

/* 解决方案使用独立信息层级，便于处理人复核并与知识库草稿保持一致。 */
.ticket-detail-page__solution-summary,
.ticket-detail-page__solution-steps p {
  margin: 12px 0 0;
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.ticket-detail-page__solution-steps {
  margin-top: 16px;
}

.ticket-detail-page__attachments {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ticket-detail-page__attachments li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--ops-border-color);
  border-radius: 8px;
  padding: 12px 14px;
}

.ticket-detail-page__attachments li > div:first-child {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.ticket-detail-page__attachments strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ticket-detail-page__attachments span,
.ticket-detail-page :deep(.el-timeline-item__content p) {
  color: var(--ops-text-secondary);
  font-size: 12px;
}

.ticket-detail-page__comments {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ticket-detail-page__comments li {
  border: 1px solid var(--ops-border-color);
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}

.ticket-detail-page__comments li.is-internal {
  border-color: #f1d194;
  background: #fff8e6;
}

.ticket-detail-page__comment-head,
.ticket-detail-page__comment-actions,
.ticket-detail-page__comment-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ticket-detail-page__comment-head {
  justify-content: space-between;
}

.ticket-detail-page__comment-head > div:first-child {
  display: grid;
  gap: 4px;
}

.ticket-detail-page__comment-head span,
.ticket-detail-page__comments p {
  color: var(--ops-text-secondary);
  font-size: 12px;
}

.ticket-detail-page__comments p {
  margin: 12px 0 0;
  color: var(--ops-text-primary);
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.ticket-detail-page__comment-files,
.ticket-detail-page__comment-uploaded {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.ticket-detail-page__comment-editor {
  display: grid;
  gap: 12px;
  margin-top: 18px;
  border: 1px solid var(--ops-border-color);
  border-radius: 8px;
  padding: 14px;
}

.ticket-detail-page__comment-toolbar {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.ticket-detail-page__aside {
  display: grid;
  gap: 26px;
  padding: 24px;
}

.ticket-detail-page__flow {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ticket-detail-page__flow li {
  position: relative;
  min-height: 52px;
  padding: 2px 0 18px 28px;
  color: var(--ops-text-secondary);
  font-size: 13px;
}

.ticket-detail-page__flow li::before {
  position: absolute;
  top: 2px;
  left: 0;
  width: 10px;
  height: 10px;
  border: 2px solid #9aa8ba;
  border-radius: 50%;
  background: white;
  content: "";
}

.ticket-detail-page__flow li:not(:last-child)::after {
  position: absolute;
  top: 14px;
  bottom: 0;
  left: 5px;
  width: 1px;
  background: var(--ops-border-color);
  content: "";
}

.ticket-detail-page__flow .is-completed::before,
.ticket-detail-page__flow .is-current::before {
  border-color: var(--ops-primary-color);
  background: var(--ops-primary-color);
}

.ticket-detail-page__flow .is-current {
  color: var(--ops-text-primary);
  font-weight: 650;
}

.ticket-detail-page__flow .is-cancelled {
  color: var(--ops-danger-color);
  font-weight: 650;
}

.ticket-detail-page__flow .is-cancelled::before {
  border-color: var(--ops-danger-color);
  background: var(--ops-danger-color);
}

.ticket-detail-page__actions h3 {
  margin: 0 0 14px;
  font-size: 16px;
}

.ticket-detail-page__action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.ticket-detail-page__action-grid :deep(.el-button) {
  width: 100%;
  margin: 0;
}

.ticket-detail-page__knowledge-hint {
  margin: 0 0 16px;
  color: var(--ops-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.ticket-detail-page__knowledge-options :deep(.el-checkbox) {
  display: flex;
  margin: 12px 0;
}

.ticket-detail-page__preview {
  min-height: 240px;
  max-height: 65vh;
  overflow: auto;
}

.ticket-detail-page__preview :deep(.el-image) {
  width: 100%;
  height: 60vh;
}

.ticket-detail-page__preview pre {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: Consolas, monospace;
  line-height: 1.7;
}

@media (max-width: 1080px) {
  .ticket-detail-page__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .ticket-detail-page__title-row {
    flex-direction: column;
  }

  .ticket-detail-page__title-actions {
    justify-content: flex-start;
  }

  .ticket-detail-page__info-grid {
    grid-template-columns: 1fr;
  }

  .ticket-detail-page__comment-head,
  .ticket-detail-page__comment-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .ticket-detail-page__main,
  .ticket-detail-page__aside {
    padding: 18px;
  }
}
</style>
