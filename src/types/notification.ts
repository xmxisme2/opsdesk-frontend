import type { ApiId } from './api'
import type { BizType } from './file'

export type NotificationType =
  | 'TICKET_ASSIGNED'
  | 'TICKET_COMMENTED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_OVERDUE'
  | 'TICKET_CLOSED'

export interface NotificationVO {
  id: ApiId
  receiverId: ApiId
  type: NotificationType
  title: string
  content: string
  bizType: BizType
  bizId: ApiId
  read: boolean
  readAt?: string
  createdAt: string
}
