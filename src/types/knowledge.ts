import type { ApiId } from './api'
import type { FileVO } from './file'

export type KnowledgeStatus = 'DRAFT' | 'PUBLISHED' | 'OFFLINE'

export interface KnowledgeArticleVO {
  id: ApiId
  title: string
  summary?: string
  content: string
  categoryId?: ApiId
  categoryName?: string
  tags: string[]
  attachments: FileVO[]
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

/** 知识库分类树节点。 */
export interface KnowledgeCategoryVO {
  id: ApiId
  parentId?: ApiId
  name: string
  sort: number
  enabled: boolean
  children: KnowledgeCategoryVO[]
}

/** 知识库标签及当前关联文章数。 */
export interface KnowledgeTagVO {
  id: ApiId
  name: string
  articleCount: number
}

/** 文章保存请求，发布和下线使用独立动作接口。 */
export interface KnowledgeArticleMutation {
  title: string
  summary?: string
  content: string
  categoryId?: ApiId
  tags: string[]
  /** 本次保存需要绑定的临时附件 ID；已绑定附件由独立删除接口管理。 */
  attachmentIds?: ApiId[]
  sourceTicketId?: ApiId
}
