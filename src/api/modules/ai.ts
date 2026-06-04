import { post } from '@/api/http'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type { AiCallLogVO } from '@/types/ai'

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
