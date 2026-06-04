import type { ApiId } from './api'
import type { BizType } from './file'

export interface AuditLogVO {
  id: ApiId
  operatorId?: ApiId
  operatorName?: string
  operationType: string
  bizType: BizType
  bizId: ApiId
  content: string
  requestIp?: string
  userAgent?: string
  createdAt: string
}
