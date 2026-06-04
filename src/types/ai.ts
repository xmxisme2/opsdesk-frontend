import type { ApiId } from './api'
import type { BizType } from './file'

export interface AiSettings {
  enabled: boolean
  provider?: string
  model?: string
  ragEnabled: boolean
  disclaimer?: string
}

export interface AiCallLogVO {
  id: ApiId
  scene: string
  bizType: BizType
  bizId: ApiId
  operatorId?: ApiId
  promptTokens?: number
  completionTokens?: number
  cost?: number
  success: boolean
  errorMessage?: string
  createdAt: string
}
