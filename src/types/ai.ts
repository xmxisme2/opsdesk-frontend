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

/** RAG 回答引用，仅包含后端完成权限复核后的文章片段。 */
export interface RagReferenceVO {
  articleId: ApiId
  title: string
  heading: string
  snippet: string
  score: number
}

/** 流式问答事件负载，页面按事件名增量更新当前回答。 */
export interface RagStreamEventMap {
  metadata: { requestId: string }
  references: { references: RagReferenceVO[] }
  token: { content: string; sequence: number }
  done: { generatedAt: string; insufficientEvidence: boolean; disclaimer: string }
  error: { code: number; message: string; traceId?: string; retryable: boolean }
}

export type RagStreamEventName = keyof RagStreamEventMap
