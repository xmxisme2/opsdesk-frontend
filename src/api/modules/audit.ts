import { post } from '@/api/http'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type { AuditLogVO } from '@/types/audit'
import type { BizType } from '@/types/file'

// 审计日志用于后台检索和工单详情时间线，普通用户不可删除日志。
export function searchAuditLogs(data: PageRequest & { operatorId?: ApiId; operationType?: string; bizType?: BizType; bizId?: ApiId; dateFrom?: string; dateTo?: string; keyword?: string }) {
  return post<PageResult<AuditLogVO>>('/audit/logs/search', data)
}

export function getTicketTimeline(ticketId: ApiId) {
  return post<{ items: { type: string; title: string; content: string; operatorName?: string; createdAt: string }[] }>(`/tickets/${ticketId}/timeline`)
}
