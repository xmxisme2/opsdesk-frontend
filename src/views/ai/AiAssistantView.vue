<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, Connection, Delete, Document, FolderAdd, MoreFilled, Plus, Position, RefreshRight, VideoPause } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import {
  archiveAiConversation,
  deleteAiConversation,
  getAiConversationDetail,
  searchAiConversations,
  streamKnowledgeAnswer,
  submitAiFeedback,
} from '@/api/modules/ai'
import type { AiConversationVO, RagReferenceVO, RagStreamEventName, RagStreamEventMap } from '@/types/ai'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  references: RagReferenceVO[]
  status: 'pending' | 'done' | 'insufficient' | 'failed' | 'stopped'
  feedback?: 'UP' | 'DOWN'
  errorMessage?: string
}

const router = useRouter()
const question = ref('')
const messages = ref<ChatMessage[]>([])
const conversations = ref<AiConversationVO[]>([])
const activeConversationId = ref<string>()
const activeTitle = ref('新会话')
const generating = ref(false)
const historyLoading = ref(false)
const detailLoading = ref(false)
const messageList = ref<HTMLElement>()
let controller: AbortController | null = null

const examples = ['VPN 连接超时怎么处理？', '无法访问内部系统应该检查什么？', '如何处理服务告警？']
const canSend = computed(() => question.value.trim().length > 0 && !generating.value && !detailLoading.value)

function createRequestId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replaceAll('-', '')
    : `${Date.now()}${Math.random().toString(16).slice(2)}`
}

function timeLabel(value: string) {
  if (!value) return ''
  const date = new Date(value.replace(' ', 'T'))
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

async function scrollToBottom() {
  await nextTick()
  if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
}

/** 刷新当前用户会话列表；页面不缓存其他用户或已删除会话。 */
async function loadConversations() {
  historyLoading.value = true
  try {
    const page = await searchAiConversations({ page: 1, size: 100, archived: false })
    conversations.value = page.records
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '会话历史加载失败')
  } finally {
    historyLoading.value = false
  }
}

/** 读取会话详情并把后端持久化状态转换为页面展示状态。 */
async function selectConversation(conversation: AiConversationVO) {
  if (generating.value || conversation.id === activeConversationId.value) return
  detailLoading.value = true
  try {
    const detail = await getAiConversationDetail(conversation.id)
    activeConversationId.value = detail.conversation.id
    activeTitle.value = detail.conversation.title
    messages.value = detail.messages.map((item) => ({
      id: item.id,
      role: item.role === 'USER' ? 'user' : 'assistant',
      content: item.content || '',
      references: item.references || [],
      status: item.status === 'FAILED' ? 'failed'
        : item.status === 'CANCELLED' ? 'stopped'
          : item.insufficientEvidence ? 'insufficient'
            : item.status === 'PENDING' ? 'pending' : 'done',
      feedback: item.feedback,
    }))
    void scrollToBottom()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '会话详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

function newConversation() {
  if (generating.value) return
  activeConversationId.value = undefined
  activeTitle.value = '新会话'
  messages.value = []
  question.value = ''
}

async function handleConversationAction(command: 'archive' | 'delete', conversation: AiConversationVO) {
  const deleting = command === 'delete'
  await ElMessageBox.confirm(
    deleting ? '删除后将无法在会话历史中恢复，确认删除吗？' : '归档后该会话将不能继续追问，确认归档吗？',
    deleting ? '删除会话' : '归档会话',
    { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' },
  )
  if (deleting) await deleteAiConversation(conversation.id)
  else await archiveAiConversation(conversation.id)
  if (activeConversationId.value === conversation.id) newConversation()
  await loadConversations()
  ElMessage.success(deleting ? '会话已删除' : '会话已归档')
}

function handleStreamEvent(message: ChatMessage, event: RagStreamEventName, data: RagStreamEventMap[RagStreamEventName]) {
  if (event === 'metadata') {
    const metadata = data as RagStreamEventMap['metadata']
    activeConversationId.value = metadata.conversationId
    message.id = metadata.messageId
  }
  if (event === 'references') message.references = (data as RagStreamEventMap['references']).references
  if (event === 'token') message.content += (data as RagStreamEventMap['token']).content
  if (event === 'done') {
    const done = data as RagStreamEventMap['done']
    message.status = done.insufficientEvidence ? 'insufficient' : 'done'
  }
  if (event === 'error') {
    const error = data as RagStreamEventMap['error']
    message.status = 'failed'
    message.errorMessage = error.message
  }
  void scrollToBottom()
}

/** 提交持久化知识问答；已有会话会自动带上会话 ID 形成受控多轮上下文。 */
async function sendQuestion(preset?: string) {
  const content = (preset ?? question.value).trim()
  if (!content || generating.value) return
  question.value = ''
  const assistant: ChatMessage = {
    id: createRequestId(), role: 'assistant', content: '', references: [], status: 'pending',
  }
  messages.value.push(
    { id: createRequestId(), role: 'user', content, references: [], status: 'done' },
    assistant,
  )
  if (!activeConversationId.value) activeTitle.value = content.length > 30 ? `${content.slice(0, 30)}…` : content
  generating.value = true
  controller = new AbortController()
  void scrollToBottom()
  try {
    await streamKnowledgeAnswer(content, activeConversationId.value, assistant.id, {
      onEvent: (event, data) => handleStreamEvent(assistant, event, data),
    }, controller.signal)
    if (assistant.status === 'pending') assistant.status = 'done'
  } catch (error) {
    if (controller.signal.aborted) assistant.status = 'stopped'
    else {
      assistant.status = 'failed'
      assistant.errorMessage = error instanceof Error ? error.message : 'AI 服务暂时不可用，请稍后重试'
    }
  } finally {
    generating.value = false
    controller = null
    await loadConversations()
    void scrollToBottom()
  }
}

function stopGeneration() { controller?.abort() }
function retry(messageIndex: number) {
  const userMessage = messages.value.slice(0, messageIndex).reverse().find((item) => item.role === 'user')
  if (userMessage) void sendQuestion(userMessage.content)
}
function handleEnter(event: KeyboardEvent) {
  if (event.shiftKey) return
  event.preventDefault()
  void sendQuestion()
}

async function feedback(message: ChatMessage, rating: 'UP' | 'DOWN') {
  if (!message.id || message.status === 'pending') return
  try {
    await submitAiFeedback(message.id, { rating, ...(rating === 'DOWN' ? { reasonCode: 'OTHER' } : {}) })
    message.feedback = rating
    ElMessage.success(rating === 'UP' ? '感谢你的反馈' : '已记录反馈，我们会用于改进回答质量')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '反馈提交失败')
  }
}

onMounted(loadConversations)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <!-- AI 助手只展示当前账号自己的会话，引用均由后端完成资源权限复核。 -->
  <section class="ai-assistant">
    <PageHeader title="AI 知识助手" description="基于已发布知识文章回答 · 支持流式生成与可核验引用">
      <template #actions><el-tag effect="plain" round>RAG · SSE</el-tag></template>
    </PageHeader>

    <div class="assistant-layout">
      <aside v-loading="historyLoading" class="session-panel">
        <div class="session-panel__title"><span>会话历史</span></div>
        <el-button class="new-session" type="primary" :icon="Plus" :disabled="generating" @click="newConversation">新建会话</el-button>
        <div class="session-group">最近会话</div>
        <div v-if="!conversations.length && !historyLoading" class="session-empty">还没有历史会话<br>开始第一次提问吧</div>
        <button
          v-for="conversation in conversations"
          :key="conversation.id"
          type="button"
          class="session-card"
          :class="{ active: conversation.id === activeConversationId }"
          @click="selectConversation(conversation)"
        >
          <span class="session-card__main"><strong>{{ conversation.title }}</strong><small>{{ timeLabel(conversation.lastMessageTime) }} · {{ conversation.messageCount }} 条消息</small></span>
          <el-dropdown trigger="click" @command="(command: 'archive' | 'delete') => handleConversationAction(command, conversation)" @click.stop>
            <span class="session-more"><el-icon><MoreFilled /></el-icon></span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="archive" :icon="FolderAdd">归档</el-dropdown-item>
                <el-dropdown-item command="delete" :icon="Delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </button>
        <div class="history-tip">会话默认保留 30 天<br>支持归档与逻辑删除</div>
      </aside>

      <main v-loading="detailLoading" class="chat-panel">
        <header class="chat-panel__header">
          <div><strong>{{ activeTitle }}</strong><span>仅检索当前账号可访问的文章</span></div>
          <el-tag type="success" effect="light" round><el-icon><Connection /></el-icon> 流式已连接</el-tag>
        </header>

        <div ref="messageList" class="message-list">
          <div v-if="!messages.length" class="empty-state">
            <div class="empty-state__icon"><el-icon><ChatDotRound /></el-icon></div>
            <h2>从已发布知识库获取可核验答案</h2>
            <p>回答只依据文章正文；证据不足时会明确拒答。</p>
            <div class="example-list"><button v-for="item in examples" :key="item" type="button" @click="sendQuestion(item)">{{ item }}</button></div>
          </div>

          <template v-for="(message, index) in messages" :key="`${message.id}-${index}`">
            <div v-if="message.role === 'user'" class="message message--user"><div class="message__bubble">{{ message.content }}</div></div>
            <div v-else class="message message--assistant">
              <div class="assistant-avatar">AI</div>
              <div class="assistant-answer">
                <div v-if="message.status === 'pending' && !message.content" class="generating"><i /><i /><i /> 正在检索知识并流式生成…</div>
                <div v-if="message.content" class="answer-content">{{ message.content }}</div>
                <div v-if="message.references.length" class="reference-list">
                  <div class="reference-list__title"><el-icon><Document /></el-icon> 引用来源 · {{ message.references.length }}</div>
                  <button v-for="reference in message.references" :key="`${message.id}-${reference.articleId}-${reference.heading}`" type="button" class="reference-card" @click="router.push(`/knowledge/${reference.articleId}`)">
                    <span><strong>{{ reference.title }}</strong><small>{{ reference.heading || '正文' }}</small></span><em>查看正文 →</em>
                  </button>
                </div>
                <div v-if="message.status === 'insufficient'" class="status-note status-note--warning">当前知识库证据不足，可换个问法或前往知识库搜索。</div>
                <div v-if="message.status === 'failed'" class="status-note status-note--error">{{ message.errorMessage || 'AI 服务暂时不可用，请稍后重试' }}<el-button link type="danger" :icon="RefreshRight" @click="retry(index)">重试</el-button></div>
                <div v-if="message.status === 'stopped'" class="status-note">生成已停止，当前内容可能不完整。</div>
                <div v-if="['done', 'insufficient'].includes(message.status)" class="feedback-row">
                  <span>有帮助吗？</span>
                  <button type="button" :class="{ selected: message.feedback === 'UP' }" title="有帮助" @click="feedback(message, 'UP')">👍</button>
                  <button type="button" :class="{ selected: message.feedback === 'DOWN' }" title="没有帮助" @click="feedback(message, 'DOWN')">👎</button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <footer class="composer">
          <el-input v-model="question" type="textarea" :rows="3" maxlength="2000" resize="none" placeholder="继续追问已发布知识库内容…" :disabled="generating" @keydown.enter="handleEnter" />
          <div class="composer__footer">
            <span>Enter 发送 · Shift+Enter 换行<br>AI 输出仅供参考，请结合实际环境确认。</span>
            <el-button v-if="generating" type="danger" plain :icon="VideoPause" @click="stopGeneration">停止生成</el-button>
            <el-button v-else type="primary" :icon="Position" :disabled="!canSend" @click="sendQuestion()">发送</el-button>
          </div>
        </footer>
      </main>
    </div>
  </section>
</template>

<style scoped>
.ai-assistant { min-height: calc(100vh - 80px); }
.assistant-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 16px; min-height: 650px; }
.session-panel, .chat-panel { background: #fff; border: 1px solid var(--ops-border-color); border-radius: 10px; }
.session-panel { position: relative; display: flex; min-height: 650px; flex-direction: column; padding: 18px 14px; }
.session-panel__title { display: flex; align-items: center; justify-content: space-between; color: var(--ops-text-primary); font-size: 16px; font-weight: 650; }
.new-session { width: 100%; margin-top: 18px; }
.session-group { margin: 22px 4px 8px; color: #576378; font-size: 12px; font-weight: 650; }
.session-card { display: flex; width: 100%; align-items: center; gap: 3px; padding: 11px 9px 11px 12px; border: 0; border-radius: 7px; background: transparent; text-align: left; cursor: pointer; }
.session-card:hover, .session-card.active { background: #f0f7ff; }
.session-card__main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 5px; }
.session-card strong { overflow: hidden; color: #0f131a; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.session-card small, .history-tip, .session-empty { color: var(--ops-text-secondary); font-size: 11px; line-height: 1.6; }
.session-more { display: grid; width: 24px; height: 24px; place-items: center; border-radius: 5px; color: #768397; }
.session-more:hover { background: #dce9f8; }
.session-empty { padding: 24px 8px; text-align: center; }
.history-tip { margin-top: auto; padding: 12px 4px 2px; }
.chat-panel { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
.chat-panel__header { display: flex; justify-content: space-between; align-items: center; padding: 17px 20px; border-bottom: 1px solid var(--ops-border-color); }
.chat-panel__header > div { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
.chat-panel__header strong { overflow: hidden; color: var(--ops-text-primary); font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
.chat-panel__header span { color: var(--ops-text-secondary); font-size: 12px; }.chat-panel__header .el-tag { display: inline-flex; gap: 4px; }
.message-list { flex: 1; min-height: 420px; max-height: calc(100vh - 330px); padding: 24px; overflow-y: auto; background: #fbfcfe; }
.empty-state { display: flex; min-height: 390px; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.empty-state__icon { display: grid; width: 52px; height: 52px; place-items: center; border-radius: 14px; background: #e9f2ff; color: #1252ad; font-size: 26px; }
.empty-state h2 { margin: 16px 0 7px; color: var(--ops-text-primary); font-size: 17px; }.empty-state p { margin: 0; color: var(--ops-text-secondary); font-size: 13px; }
.example-list { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 22px; }.example-list button { padding: 8px 12px; border: 1px solid #c9dcf7; border-radius: 16px; background: #fff; color: #1252ad; cursor: pointer; }.example-list button:hover { background: #f0f7ff; }
.message { display: flex; margin-bottom: 22px; }.message--user { justify-content: flex-end; }.message__bubble { max-width: 72%; padding: 11px 14px; border-radius: 12px 12px 2px 12px; background: #1252ad; color: #fff; line-height: 1.65; white-space: pre-wrap; }
.message--assistant { align-items: flex-start; gap: 10px; }.assistant-avatar { display: grid; flex: 0 0 34px; height: 34px; place-items: center; border-radius: 9px; background: #e8faf0; color: #148c59; font-size: 12px; font-weight: 700; }.assistant-answer { min-width: 0; max-width: 82%; }
.answer-content, .generating { padding: 12px 15px; border: 1px solid #dbe3ed; border-radius: 2px 12px 12px 12px; background: #fff; color: var(--ops-text-primary); line-height: 1.75; overflow-wrap: anywhere; white-space: pre-wrap; }.generating { color: #148c59; }.generating i { display: inline-block; width: 5px; height: 5px; margin-right: 3px; animation: pulse 1.2s infinite; border-radius: 50%; background: #148c59; }.generating i:nth-child(2) { animation-delay: .15s; }.generating i:nth-child(3) { animation-delay: .3s; }
.reference-list { margin-top: 10px; padding: 12px; border: 1px solid #dbe3ed; border-radius: 8px; background: #fff; }.reference-list__title { display: flex; align-items: center; gap: 5px; margin-bottom: 8px; color: #576378; font-size: 12px; font-weight: 650; }.reference-card { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 10px; border: 0; border-top: 1px solid #edf1f5; background: transparent; text-align: left; cursor: pointer; }.reference-card span { display: flex; min-width: 0; flex-direction: column; gap: 3px; }.reference-card strong { color: #0f131a; font-size: 13px; }.reference-card small { color: #7b8798; }.reference-card em { flex: none; color: #1252ad; font-size: 12px; font-style: normal; }
.status-note { margin-top: 8px; padding: 9px 11px; border-radius: 6px; background: #f6f9fc; color: #576378; font-size: 12px; }.status-note--warning { background: #fff7e0; color: #a76600; }.status-note--error { background: #fff0f0; color: #c72e2e; }
.feedback-row { display: flex; align-items: center; gap: 6px; margin-top: 9px; color: #576378; font-size: 12px; }.feedback-row button { width: 28px; height: 26px; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; cursor: pointer; }.feedback-row button:hover, .feedback-row button.selected { border-color: #bfd4f0; background: #edf5ff; }
.composer { padding: 14px 18px 16px; border-top: 1px solid var(--ops-border-color); background: #fff; }.composer__footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }.composer__footer span { color: var(--ops-text-secondary); font-size: 11px; line-height: 1.7; }
@keyframes pulse { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }
@media (max-width: 900px) { .assistant-layout { grid-template-columns: 1fr; }.session-panel { display: none; }.message-list { max-height: none; }.assistant-answer { max-width: 90%; } }
</style>
