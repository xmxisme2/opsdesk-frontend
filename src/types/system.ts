import type { ApiId } from './api'
import type { TicketPriority } from './ticket'

export interface UploadPolicy {
  maxFileSizeMb: number
  maxFilesPerTicket: number
  allowedExtensions: string[]
  previewableExtensions: string[]
  downloadOnlyExtensions: string[]
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
