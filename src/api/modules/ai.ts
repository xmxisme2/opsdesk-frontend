import { post } from '@/api/http'
import { getAccessToken } from '@/utils/auth-token'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type {
  AiCallLogVO,
  AiConversationDetailVO,
  AiConversationVO,
  AiQualityOverviewVO,
  AiQualityResult,
  AiQualitySampleVO,
  RagStreamEventMap,
  RagStreamEventName,
} from '@/types/ai'

// AI 当前仅保留预留接口；开关关闭时菜单隐藏，后端也必须返回明确禁用提示。
export function getTicketAiSummary(id: ApiId, forceRefresh = false) {
  return post<{ summary: string; generatedAt: string; references: unknown[] }>(`/ai/tickets/${id}/summary`, { forceRefresh })
}

export function getTicketAiSuggestion(id: ApiId) {
  return post<{ suggestions: { title: string; steps: string[]; confidence: number; references: unknown[] }[] }>(`/ai/tickets/${id}/suggestion`, { includeKnowledge: true })
}

export function searchAiCallLogs(data: PageRequest & { scene?: string; success?: boolean; dateFrom?: string; dateTo?: string }) {
  return post<PageResult<AiCallLogVO>>('/ai/call-logs/search', data)
}

/** 查询 ADMIN 可见的 AI 质量总览，后端限制单次统计范围不超过 90 天。 */
export function getAiQualityOverview(data: { dateFrom?: string; dateTo?: string }) {
  return post<AiQualityOverviewVO>('/ai/admin/quality/overview', data, { dedupe: 'cancel-previous' })
}

/** 查询拒答、失败或被点踩的低质量样本。 */
export function searchAiQualitySamples(data: PageRequest & {
  dateFrom?: string
  dateTo?: string
  result?: AiQualityResult
  reasonCode?: string
  keyword?: string
}) {
  return post<PageResult<AiQualitySampleVO>>('/ai/admin/quality/samples/search', data, { dedupe: 'cancel-previous' })
}

/** 查询当前账号自己的有效会话，后端会强制执行所有者范围。 */
export function searchAiConversations(data: PageRequest & { keyword?: string; archived?: boolean }) {
  return post<PageResult<AiConversationVO>>('/ai/conversations/search', data)
}

export function getAiConversationDetail(id: ApiId) {
  return post<AiConversationDetailVO>(`/ai/conversations/${id}/detail`, {})
}

export function archiveAiConversation(id: ApiId) {
  return post<{ id: ApiId; status: string }>(`/ai/conversations/${id}/archive`, {})
}

export function deleteAiConversation(id: ApiId) {
  return post<{ id: ApiId; status: string }>(`/ai/conversations/${id}/delete`, {})
}

export function submitAiFeedback(id: ApiId, data: { rating: 'UP' | 'DOWN'; reasonCode?: string; comment?: string }) {
  return post<void>(`/ai/messages/${id}/feedback`, data)
}

export interface RagStreamHandlers {
  onEvent: <T extends RagStreamEventName>(event: T, data: RagStreamEventMap[T]) => void
}

function parseSseBlock(block: string, handlers: RagStreamHandlers) {
  let eventName = ''
  const dataLines: string[] = []
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim()
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
  }
  if (!eventName || !dataLines.length) return
  if (!['metadata', 'references', 'token', 'done', 'error'].includes(eventName)) return
  const name = eventName as RagStreamEventName
  handlers.onEvent(name, JSON.parse(dataLines.join('\n')) as RagStreamEventMap[typeof name])
}

/** 使用 fetch 读取 POST SSE，URL、鉴权与事件解析统一收口在 API 模块。 */
export async function streamKnowledgeAnswer(
  question: string,
  conversationId: ApiId | undefined,
  clientRequestId: string,
  handlers: RagStreamHandlers,
  signal: AbortSignal,
) {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  const token = getAccessToken()
  const response = await fetch(`${apiBase}/ai/knowledge/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question, conversationId, clientRequestId }),
    signal,
  })
  if (!response.ok || !response.body) {
    let message = 'AI 服务暂时不可用，请稍后重试'
    try {
      const payload = await response.json() as { message?: string }
      message = payload.message || message
    } catch {
      // 非 JSON 网关错误统一展示可重试提示，避免将服务端页面暴露给用户。
    }
    throw new Error(message)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n')
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() || ''
    blocks.forEach((block) => parseSseBlock(block, handlers))
    if (done) break
  }
  if (buffer.trim()) parseSseBlock(buffer, handlers)
}
