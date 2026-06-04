import type { ApiId } from './api'

export type KnowledgeStatus = 'DRAFT' | 'PUBLISHED' | 'OFFLINE'

export interface KnowledgeArticleVO {
  id: ApiId
  title: string
  summary?: string
  content: string
  categoryId?: ApiId
  categoryName?: string
  tags: string[]
  sourceTicketId?: ApiId
  sourceTicketNo?: string
  status: KnowledgeStatus
  authorId: ApiId
  authorName: string
  viewCount: number
  publishedAt?: string
  createdAt: string
  updatedAt: string
}
