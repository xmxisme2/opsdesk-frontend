import type { ApiId } from './api'
import type { BizType } from './file'

export interface AiSettings {
  enabled: boolean
  provider?: string
  model?: string
  ragEnabled: boolean
  effectiveEnabled: boolean
  effectiveRagEnabled: boolean
  environmentEnabled: boolean
  environmentRagEnabled: boolean
  disclaimer?: string
  updateTime?: string
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
  metadata: { requestId: string; conversationId: ApiId; messageId: ApiId }
  references: { references: RagReferenceVO[] }
  token: { content: string; sequence: number }
  done: { generatedAt: string; insufficientEvidence: boolean; disclaimer: string; answer?: string }
  error: { code: number; message: string; traceId?: string; retryable: boolean }
}

export type RagStreamEventName = keyof RagStreamEventMap

/** 当前用户自己的 AI 会话历史列表项。 */
export interface AiConversationVO {
  id: ApiId
  title: string
  status: 'ACTIVE' | 'ARCHIVED'
  messageCount: number
  lastMessageTime: string
  createTime: string
}

/** 已持久化的 AI 会话消息。 */
export interface AiMessageVO {
  id: ApiId
  role: 'USER' | 'ASSISTANT'
  content: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  insufficientEvidence: boolean
  feedback?: 'UP' | 'DOWN'
  createTime: string
  references: RagReferenceVO[]
}

export interface AiConversationDetailVO {
  conversation: AiConversationVO
  messages: AiMessageVO[]
}

/** AI 质量看板顶部聚合指标，比率字段均为百分数。 */
export interface AiQualitySummaryVO {
  totalCalls: number
  successCalls: number
  failedCalls: number
  insufficientCalls: number
  successRate: number
  refusalRate: number
  feedbackCount: number
  upFeedbackCount: number
  downFeedbackCount: number
  positiveRate: number
  averageDurationMs: number
  p95DurationMs: number
  averageReferenceCount: number
}

export interface AiQualityTrendVO {
  date: string
  totalCalls: number
  successCalls: number
  insufficientCalls: number
  failedCalls: number
  negativeFeedbackCount: number
}

export interface AiQualityDistributionVO {
  name: string
  value: number
}

export interface AiQualityOverviewVO {
  dateFrom: string
  dateTo: string
  summary: AiQualitySummaryVO
  trends: AiQualityTrendVO[]
  resultDistribution: AiQualityDistributionVO[]
  feedbackReasons: AiQualityDistributionVO[]
}

export type AiQualityResult = 'SUCCESS' | 'REFUSAL' | 'FAILED' | 'NEGATIVE'

/** 管理员低质量样本，问题和回答均来自独立 AI 服务已脱敏消息。 */
export interface AiQualitySampleVO {
  callId: ApiId
  conversationId?: ApiId
  messageId?: ApiId
  operatorId?: ApiId
  question?: string
  answer?: string
  result: AiQualityResult
  durationMs: number
  referenceCount: number
  rating?: 'UP' | 'DOWN'
  reasonCode?: string
  issueReason?: string
  createTime: string
}
