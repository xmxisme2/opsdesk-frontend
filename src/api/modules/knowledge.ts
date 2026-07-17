import { post } from '@/api/http'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type { KnowledgeArticleMutation, KnowledgeArticleVO, KnowledgeCategoryVO, KnowledgeStatus, KnowledgeTagVO } from '@/types/knowledge'

// 知识库 API 统一承载文章、分类和标签能力，页面不得直接拼接 Axios URL。
export function searchKnowledgeArticles(data: PageRequest & { keyword?: string; categoryId?: ApiId; tag?: string; status?: KnowledgeStatus }) {
  return post<PageResult<KnowledgeArticleVO>>('/knowledge/articles/search', data)
}

export function getKnowledgeArticleDetail(id: ApiId) {
  return post<KnowledgeArticleVO>(`/knowledge/articles/${id}/detail`)
}

export function createKnowledgeArticle(data: KnowledgeArticleMutation) {
  return post<KnowledgeArticleVO>('/knowledge/articles/create', data)
}

export function updateKnowledgeArticle(id: ApiId, data: KnowledgeArticleMutation) {
  return post<KnowledgeArticleVO>(`/knowledge/articles/${id}/update`, data)
}

export function deleteKnowledgeArticle(id: ApiId, reason?: string) {
  return post<Record<string, never>>(`/knowledge/articles/${id}/delete`, { reason })
}

export function createKnowledgeArticleFromTicket(ticketId: ApiId, data: { includeComments: boolean; includeAttachments: boolean }) {
  return post<KnowledgeArticleVO>(`/knowledge/articles/from-ticket/${ticketId}`, data)
}

export function publishKnowledgeArticle(id: ApiId, publishRemark?: string) {
  return post<KnowledgeArticleVO>(`/knowledge/articles/${id}/publish`, { publishRemark })
}

export function offlineKnowledgeArticle(id: ApiId, reason: string) {
  return post<KnowledgeArticleVO>(`/knowledge/articles/${id}/offline`, { reason })
}

export function getKnowledgeCategoryTree(enabled?: boolean) {
  return post<KnowledgeCategoryVO[]>('/knowledge/categories/tree', { enabled })
}

export function searchKnowledgeTags(keyword?: string, limit = 100) {
  return post<KnowledgeTagVO[]>('/knowledge/tags/search', { keyword, limit })
}
