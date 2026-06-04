import type { ApiId } from './api'
import type { FileVO } from './file'

export type TicketStatus =
  | 'DRAFT'
  | 'PENDING_ASSIGN'
  | 'PENDING_PROCESS'
  | 'PROCESSING'
  | 'PENDING_CONFIRM'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED'

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface TicketListItemVO {
  id: ApiId
  ticketNo: string
  title: string
  categoryName?: string
  priority: TicketPriority
  status: TicketStatus
  creatorName?: string
  assigneeName?: string
  teamName?: string
  dueTime?: string
  overdue: boolean
  createdAt: string
  updatedAt: string
}

export interface TicketVO extends TicketListItemVO {
  description: string
  categoryId?: ApiId
  creatorId: ApiId
  assigneeId?: ApiId
  teamId?: ApiId
  completedTime?: string
  closedTime?: string
  tags: string[]
  watching: boolean
  attachments: FileVO[]
  availableActions?: TicketAction[]
}

export type TicketAction =
  | 'submit'
  | 'assign'
  | 'reject'
  | 'accept'
  | 'transfer'
  | 'complete'
  | 'confirm'
  | 'reopen'
  | 'close'
  | 'cancel'
