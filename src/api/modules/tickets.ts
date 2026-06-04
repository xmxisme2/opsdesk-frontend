import { post } from '@/api/http'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type { TicketListItemVO, TicketPriority, TicketStatus, TicketVO } from '@/types/ticket'

export interface TicketSearchRequest extends PageRequest {
  keyword?: string
  status?: TicketStatus
  priority?: TicketPriority
  categoryId?: ApiId
  creatorId?: ApiId
  assigneeId?: ApiId
  teamId?: ApiId
  overdue?: boolean
  scope?: 'created' | 'assigned' | 'watching'
}

// 工单状态动作必须以后端返回的可用动作为准，前端不自行推导状态机。
export function searchTickets(data: TicketSearchRequest) {
  return post<PageResult<TicketListItemVO>>('/tickets/search', data)
}

export function createTicket(data: Partial<TicketVO> & { submitNow?: boolean }) {
  return post<TicketVO>('/tickets/create', data)
}

export function getTicketDetail(id: ApiId) {
  return post<TicketVO>(`/tickets/${id}/detail`)
}

export function updateTicket(id: ApiId, data: Partial<TicketVO>) {
  return post<TicketVO>(`/tickets/${id}/update`, data)
}

export function submitTicket(id: ApiId) {
  return post<TicketVO>(`/tickets/${id}/submit`)
}

export function assignTicket(id: ApiId, data: { teamId?: ApiId; assigneeId?: ApiId; reason?: string }) {
  return post<TicketVO>(`/tickets/${id}/assign`, data)
}

export function rejectTicket(id: ApiId, reason: string) {
  return post<TicketVO>(`/tickets/${id}/reject`, { reason })
}

export function acceptTicket(id: ApiId) {
  return post<TicketVO>(`/tickets/${id}/accept`)
}

export function transferTicket(id: ApiId, data: { teamId?: ApiId; assigneeId?: ApiId; reason: string }) {
  return post<TicketVO>(`/tickets/${id}/transfer`, data)
}

export function completeTicket(id: ApiId, data: { result?: string; attachmentIds?: ApiId[] }) {
  return post<TicketVO>(`/tickets/${id}/complete`, data)
}

export function confirmTicket(id: ApiId) {
  return post<TicketVO>(`/tickets/${id}/confirm`)
}

export function reopenTicket(id: ApiId, reason: string) {
  return post<TicketVO>(`/tickets/${id}/reopen`, { reason })
}

export function closeTicket(id: ApiId) {
  return post<TicketVO>(`/tickets/${id}/close`)
}

export function cancelTicket(id: ApiId, reason?: string) {
  return post<TicketVO>(`/tickets/${id}/cancel`, { reason })
}

export function watchTicket(id: ApiId) {
  return post<TicketVO>(`/tickets/${id}/watch`)
}

export function unwatchTicket(id: ApiId) {
  return post<TicketVO>(`/tickets/${id}/unwatch`)
}
