import type { TicketPriority, TicketStatus } from '@/types/ticket'

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  DRAFT: '草稿',
  PENDING_ASSIGN: '待分派',
  PENDING_PROCESS: '待处理',
  PROCESSING: '处理中',
  PENDING_CONFIRM: '待确认',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
  CANCELLED: '已取消',
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '紧急',
}
