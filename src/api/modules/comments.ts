import { post } from '@/api/http'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type { FileVO } from '@/types/file'

export interface CommentVO {
  id: ApiId
  ticketId: ApiId
  content: string
  commentType: 'PUBLIC' | 'INTERNAL'
  authorId: ApiId
  authorName: string
  attachments: FileVO[]
  deleted: boolean
  createdAt: string
}

// 评论接口用于工单详情协作区，内部备注可见性必须由后端按资源范围控制。
export function createComment(ticketId: ApiId, data: { content: string; commentType: 'PUBLIC' | 'INTERNAL'; tempToken?: string }) {
  return post<CommentVO>(`/tickets/${ticketId}/comments/create`, data)
}

export function searchComments(ticketId: ApiId, data: PageRequest) {
  return post<PageResult<CommentVO>>(`/tickets/${ticketId}/comments/search`, data)
}

export function deleteComment(id: ApiId, reason?: string) {
  return post<Record<string, never>>(`/comments/${id}/delete`, { reason })
}
