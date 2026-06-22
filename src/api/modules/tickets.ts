import { post } from '@/api/http'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type {
  TicketCategoryVO,
  TicketListItemVO,
  TicketOperationLogVO,
  TicketPriority,
  TicketStatus,
  TicketVO,
  TicketWatchVO,
} from '@/types/ticket'

export interface TicketSearchRequest extends PageRequest {
  scope?: 'created' | 'assigned' | 'watching'
  ticketNo?: string
  keyword?: string
  status?: TicketStatus
  priority?: TicketPriority
  categoryId?: ApiId
  creatorId?: ApiId
  assigneeId?: ApiId
  teamId?: ApiId
  overdue?: boolean
  createdFrom?: string
  createdTo?: string
}

export interface TicketMutationRequest {
  title: string
  description: string
  categoryId: ApiId
  priority: TicketPriority
  dueTime?: string
  tags?: string[]
  attachmentIds?: ApiId[]
}

export interface TicketCreateRequest extends TicketMutationRequest {
  submitNow: boolean
}

export interface TicketAssignRequest {
  teamId?: ApiId
  assigneeId?: ApiId
  reason?: string
}

export interface TicketTransferRequest {
  targetTeamId?: ApiId
  targetAssigneeId?: ApiId
  reason: string
}

// 工单 API 统一放在模块文件中，页面只消费类型化方法，不直接拼接请求路径。
export function getTicketCategoryTree(data: { enabled?: boolean; keyword?: string } = {}) {
  return post<TicketCategoryVO[]>('/ticket-categories/tree', data, {
    dedupe: 'cancel-previous',
    dedupeKey: 'ticket-categories:tree',
  })
}

export function searchTickets(data: TicketSearchRequest) {
  return post<PageResult<TicketListItemVO>>('/tickets/search', data, {
    dedupe: 'cancel-previous',
    dedupeKey: `tickets:search:${data.scope ?? 'all'}`,
  })
}

export function createTicket(data: TicketCreateRequest) {
  return post<TicketVO>('/tickets/create', data, { dedupe: 'ignore-current', dedupeKey: 'tickets:create' })
}

export function getTicketDetail(id: ApiId) {
  return post<TicketVO>(`/tickets/${id}/detail`)
}

export function updateTicket(id: ApiId, data: TicketMutationRequest) {
  return post<TicketVO>(`/tickets/${id}/update`, data, {
    dedupe: 'ignore-current',
    dedupeKey: `tickets:${id}:update`,
  })
}

export function submitTicket(id: ApiId) {
  return ticketAction(id, 'submit')
}

export function assignTicket(id: ApiId, data: TicketAssignRequest) {
  return ticketAction(id, 'assign', data)
}

export function rejectTicket(id: ApiId, reason: string) {
  return ticketAction(id, 'reject', { reason })
}

export function acceptTicket(id: ApiId) {
  return ticketAction(id, 'accept')
}

export function transferTicket(id: ApiId, data: TicketTransferRequest) {
  return ticketAction(id, 'transfer', data)
}

export function completeTicket(id: ApiId, data: { completeRemark?: string; attachmentIds?: ApiId[] }) {
  return ticketAction(id, 'complete', data)
}

export function confirmTicket(id: ApiId, comment?: string) {
  return ticketAction(id, 'confirm', { comment })
}

export function reopenTicket(id: ApiId, reason: string) {
  return ticketAction(id, 'reopen', { reason })
}

export function closeTicket(id: ApiId, reason?: string) {
  return ticketAction(id, 'close', { reason })
}

export function cancelTicket(id: ApiId, reason: string) {
  return ticketAction(id, 'cancel', { reason })
}

export function watchTicket(id: ApiId) {
  return post<TicketWatchVO>(`/tickets/${id}/watch`, undefined, {
    dedupe: 'ignore-current',
    dedupeKey: `tickets:${id}:watch`,
  })
}

export function unwatchTicket(id: ApiId) {
  return post<TicketWatchVO>(`/tickets/${id}/unwatch`, undefined, {
    dedupe: 'ignore-current',
    dedupeKey: `tickets:${id}:unwatch`,
  })
}

export function searchTicketOperationLogs(id: ApiId, data: PageRequest) {
  return post<PageResult<TicketOperationLogVO>>(`/tickets/${id}/operation-logs/search`, data, {
    dedupe: 'cancel-previous',
    dedupeKey: `tickets:${id}:operation-logs`,
  })
}

function ticketAction(id: ApiId, action: string, data?: unknown) {
  return post<TicketVO>(`/tickets/${id}/${action}`, data, {
    dedupe: 'ignore-current',
    dedupeKey: `tickets:${id}:${action}`,
  })
}
