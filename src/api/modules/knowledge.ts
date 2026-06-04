import { post } from '@/api/http'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type { KnowledgeArticleVO, KnowledgeStatus } from '@/types/knowledge'

// 知识库为 P2 能力，当前前端只预留模块 API，真实页面等主流程稳定后实现。
export function searchKnowledgeArticles(data: PageRequest & { keyword?: string; categoryId?: ApiId; tag?: string; status?: KnowledgeStatus }) {
  return post<PageResult<KnowledgeArticleVO>>('/knowledge/articles/search', data)
}

export function getKnowledgeArticleDetail(id: ApiId) {
  return post<KnowledgeArticleVO>(`/knowledge/articles/${id}/detail`)
}

export function createKnowledgeArticle(data: Partial<KnowledgeArticleVO>) {
  return post<KnowledgeArticleVO>('/knowledge/articles/create', data)
}

export function updateKnowledgeArticle(id: ApiId, data: Partial<KnowledgeArticleVO>) {
  return post<KnowledgeArticleVO>(`/knowledge/articles/${id}/update`, data)
}

export function deleteKnowledgeArticle(id: ApiId, reason?: string) {
  return post<Record<string, never>>(`/knowledge/articles/${id}/delete`, { reason })
}

export function createKnowledgeArticleFromTicket(ticketId: ApiId, data: { includeComments: boolean; includeAttachments: boolean }) {
  return post<KnowledgeArticleVO>(`/knowledge/articles/from-ticket/${ticketId}`, data)
}
