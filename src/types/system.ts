import type { ApiId } from './api'
import type { TicketPriority } from './ticket'

export interface UploadPolicy {
  maxFileSizeMb: number
  maxFilesPerTicket: number
  allowedExtensions: string[]
  previewableExtensions: string[]
  downloadOnlyExtensions: string[]
}

export interface NotificationTemplateVO {
  id: ApiId
  type: 'TICKET_ASSIGNED' | 'TICKET_COMMENTED' | 'TICKET_STATUS_CHANGED' | 'TICKET_OVERDUE' | 'TICKET_CLOSED'
  channel: 'IN_APP' | 'EMAIL'
  titleTemplate: string
  contentTemplate: string
  enabled: boolean
  allowedVariables: string[]
  variableDescriptions: Record<string, string>
  updatedAt?: string
}

export interface PriorityOption {
  code: TicketPriority
  name: string
  sort: number
  color: string
  enabled?: boolean
}

export interface SlaRuleVO {
  id: ApiId
  categoryId: ApiId
  priority: TicketPriority
  responseHours: number
  resolveHours: number
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

export type SlaRuleMutationRequest = Omit<SlaRuleVO, 'id' | 'createdAt' | 'updatedAt'>
