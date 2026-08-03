<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChatDotRound, Connection, Document, Position, RefreshRight, VideoPause } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { streamKnowledgeAnswer } from '@/api/modules/ai'
import type { RagReferenceVO, RagStreamEventName, RagStreamEventMap } from '@/types/ai'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  references: RagReferenceVO[]
  status: 'pending' | 'done' | 'insufficient' | 'failed' | 'stopped'
  errorMessage?: string
}

const router = useRouter()
const question = ref('')
const messages = ref<ChatMessage[]>([])
const generating = ref(false)
const messageList = ref<HTMLElement>()
let controller: AbortController | null = null

const examples = ['VPN 连接超时怎么处理？', '无法访问内部系统应该检查什么？', '如何处理服务告警？']
const canSend = computed(() => question.value.trim().length > 0 && !generating.value)

function createRequestId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replaceAll('-', '')
    : `${Date.now()}${Math.random().toString(16).slice(2)}`
}

async function scrollToBottom() {
  await nextTick()
  if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
}

function handleStreamEvent(message: ChatMessage, event: RagStreamEventName, data: RagStreamEventMap[RagStreamEventName]) {
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

/** 提交单轮知识问答；上下文与会话历史首版不跨请求发送。 */
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
  generating.value = true
  controller = new AbortController()
  void scrollToBottom()
  try {
    await streamKnowledgeAnswer(content, assistant.id, {
      onEvent: (event, data) => handleStreamEvent(assistant, event, data),
    }, controller.signal)
    if (assistant.status === 'pending') assistant.status = 'done'
  } catch (error) {
    if (controller.signal.aborted) {
      assistant.status = 'stopped'
    } else {
      assistant.status = 'failed'
      assistant.errorMessage = error instanceof Error ? error.message : 'AI 服务暂时不可用，请稍后重试'
    }
  } finally {
    generating.value = false
    controller = null
    void scrollToBottom()
  }
}

function stopGeneration() {
  controller?.abort()
}

function retry(messageIndex: number) {
  const userMessage = messages.value.slice(0, messageIndex).reverse().find((item) => item.role === 'user')
  if (userMessage) void sendQuestion(userMessage.content)
}

function handleEnter(event: KeyboardEvent) {
  if (event.shiftKey) return
  event.preventDefault()
  void sendQuestion()
}

onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <!-- AI 助手仅使用已发布文章正文，所有引用均由后端完成资源权限复核。 -->
  <section class="ai-assistant">
    <PageHeader title="AI 知识助手" description="基于已发布知识文章回答 · 支持流式生成与可核验引用">
      <template #actions><el-tag effect="plain" round>RAG · SSE</el-tag></template>
    </PageHeader>

    <div class="assistant-layout">
      <aside class="session-panel">
        <div class="session-panel__title"><el-icon><ChatDotRound /></el-icon> 当前会话</div>
        <div class="session-card active">
          <strong>单轮知识问答</strong>
          <span>{{ messages.length ? '本次页面会话' : '等待开始提问' }}</span>
        </div>
        <div class="history-tip">会话历史将在后续阶段开放，本页刷新后不保留问答内容。</div>
      </aside>

      <main class="chat-panel">
        <header class="chat-panel__header">
          <div><strong>知识库问答</strong><span>仅检索当前账号可访问的文章</span></div>
          <el-tag type="success" effect="light" round><el-icon><Connection /></el-icon> 已连接</el-tag>
        </header>

        <div ref="messageList" class="message-list">
          <div v-if="!messages.length" class="empty-state">
            <div class="empty-state__icon"><el-icon><ChatDotRound /></el-icon></div>
            <h2>从已发布知识库获取可核验答案</h2>
            <p>回答只依据文章正文；证据不足时会明确拒答。</p>
            <div class="example-list">
              <button v-for="item in examples" :key="item" type="button" @click="sendQuestion(item)">{{ item }}</button>
            </div>
          </div>

          <template v-for="(message, index) in messages" :key="message.id">
            <div v-if="message.role === 'user'" class="message message--user"><div class="message__bubble">{{ message.content }}</div></div>
            <div v-else class="message message--assistant">
              <div class="assistant-avatar">AI</div>
              <div class="assistant-answer">
                <div v-if="message.status === 'pending' && !message.content" class="generating"><i /><i /><i /> 正在检索知识并流式生成…</div>
                <div v-if="message.content" class="answer-content">{{ message.content }}</div>
                <div v-if="message.references.length" class="reference-list">
                  <div class="reference-list__title"><el-icon><Document /></el-icon> 引用来源</div>
                  <button v-for="reference in message.references" :key="`${message.id}-${reference.articleId}-${reference.heading}`" type="button" class="reference-card" @click="router.push(`/knowledge/${reference.articleId}`)">
                    <span><strong>{{ reference.title }}</strong><small>{{ reference.heading || '正文' }}</small></span>
                    <em>查看文章</em>
                  </button>
                </div>
                <div v-if="message.status === 'insufficient'" class="status-note status-note--warning">当前知识库证据不足，可换个问法或前往知识库搜索。</div>
                <div v-if="message.status === 'failed'" class="status-note status-note--error">
                  {{ message.errorMessage || 'AI 服务暂时不可用，请稍后重试' }}
                  <el-button link type="danger" :icon="RefreshRight" @click="retry(index)">重试</el-button>
                </div>
                <div v-if="message.status === 'stopped'" class="status-note">生成已停止，当前内容可能不完整。</div>
              </div>
            </div>
          </template>
        </div>

        <footer class="composer">
          <el-input v-model="question" type="textarea" :rows="3" maxlength="2000" resize="none" placeholder="输入你的问题，Enter 发送，Shift + Enter 换行" :disabled="generating" @keydown.enter="handleEnter" />
          <div class="composer__footer">
            <span>AI 回答仅供参考，请以实际系统状态和知识文章为准。</span>
            <el-button v-if="generating" :icon="VideoPause" @click="stopGeneration">停止生成</el-button>
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
.session-panel { padding: 18px 14px; }
.session-panel__title { display: flex; align-items: center; gap: 8px; color: var(--ops-text-primary); font-size: 15px; font-weight: 650; }
.session-card { display: flex; flex-direction: column; gap: 5px; margin-top: 18px; padding: 13px; border-radius: 8px; background: #f0f7ff; border-left: 3px solid #1252ad; }
.session-card strong { font-size: 13px; color: #0f131a; }
.session-card span, .history-tip { color: var(--ops-text-secondary); font-size: 12px; line-height: 1.6; }
.history-tip { margin-top: 18px; padding: 12px; background: #f6f9fc; border-radius: 8px; }
.chat-panel { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
.chat-panel__header { display: flex; justify-content: space-between; align-items: center; padding: 17px 20px; border-bottom: 1px solid var(--ops-border-color); }
.chat-panel__header > div { display: flex; flex-direction: column; gap: 4px; }
.chat-panel__header strong { color: var(--ops-text-primary); font-size: 16px; }
.chat-panel__header span { color: var(--ops-text-secondary); font-size: 12px; }
.chat-panel__header .el-tag { display: inline-flex; gap: 4px; }
.message-list { flex: 1; min-height: 420px; max-height: calc(100vh - 330px); padding: 24px; overflow-y: auto; background: #fbfcfe; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 390px; text-align: center; }
.empty-state__icon { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 14px; background: #e9f2ff; color: #1252ad; font-size: 26px; }
.empty-state h2 { margin: 16px 0 7px; font-size: 17px; color: var(--ops-text-primary); }
.empty-state p { margin: 0; color: var(--ops-text-secondary); font-size: 13px; }
.example-list { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 22px; }
.example-list button { padding: 8px 12px; border: 1px solid #c9dcf7; border-radius: 16px; background: #fff; color: #1252ad; cursor: pointer; }
.example-list button:hover { background: #f0f7ff; }
.message { display: flex; margin-bottom: 22px; }
.message--user { justify-content: flex-end; }
.message__bubble { max-width: 72%; padding: 11px 14px; border-radius: 12px 12px 2px 12px; background: #1252ad; color: #fff; line-height: 1.65; white-space: pre-wrap; }
.message--assistant { align-items: flex-start; gap: 10px; }
.assistant-avatar { display: grid; place-items: center; flex: 0 0 34px; height: 34px; border-radius: 9px; background: #e8faf0; color: #148c59; font-size: 12px; font-weight: 700; }
.assistant-answer { min-width: 0; max-width: 82%; }
.answer-content, .generating { padding: 12px 15px; border-radius: 2px 12px 12px 12px; background: #fff; border: 1px solid #dbe3ed; color: var(--ops-text-primary); line-height: 1.75; white-space: pre-wrap; overflow-wrap: anywhere; }
.generating { color: #148c59; }
.generating i { display: inline-block; width: 5px; height: 5px; margin-right: 3px; border-radius: 50%; background: #148c59; animation: pulse 1.2s infinite; }
.generating i:nth-child(2) { animation-delay: .15s; }.generating i:nth-child(3) { animation-delay: .3s; }
.reference-list { margin-top: 10px; padding: 12px; border: 1px solid #dbe3ed; border-radius: 8px; background: #fff; }
.reference-list__title { display: flex; align-items: center; gap: 5px; margin-bottom: 8px; color: #576378; font-size: 12px; font-weight: 650; }
.reference-card { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 10px; border: 0; border-top: 1px solid #edf1f5; background: transparent; text-align: left; cursor: pointer; }
.reference-card span { display: flex; min-width: 0; flex-direction: column; gap: 3px; }.reference-card strong { color: #0f131a; font-size: 13px; }.reference-card small { color: #7b8798; }.reference-card em { flex: none; color: #1252ad; font-size: 12px; font-style: normal; }
.status-note { margin-top: 8px; padding: 9px 11px; border-radius: 6px; background: #f6f9fc; color: #576378; font-size: 12px; }
.status-note--warning { background: #fff7e0; color: #a76600; }.status-note--error { background: #fff0f0; color: #c72e2e; }
.composer { padding: 14px 18px 16px; border-top: 1px solid var(--ops-border-color); background: #fff; }
.composer__footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }
.composer__footer span { color: var(--ops-text-secondary); font-size: 12px; }
@keyframes pulse { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }
@media (max-width: 900px) { .assistant-layout { grid-template-columns: 1fr; }.session-panel { display: none; }.message-list { max-height: none; }.assistant-answer { max-width: 90%; } }
</style>
