import type { ApiId } from './api'

export type FilePreviewType = 'IMAGE' | 'TEXT' | 'DOWNLOAD_ONLY'
export type BizType = 'TICKET' | 'COMMENT' | 'ATTACHMENT' | 'KNOWLEDGE' | 'USER' | 'ROLE' | 'SYSTEM_CONFIG' | 'AI'

export interface FileVO {
  id: ApiId
  bizType: BizType
  bizId?: ApiId | null
  tempToken?: string | null
  fileName: string
  fileSize: number
  contentType: string
  extension: string
  previewable: boolean
  previewType: FilePreviewType
  downloadOnly: boolean
  downloadUrl?: string
  uploaderId?: ApiId
  uploaderName?: string
  createdAt: string
}

export interface FilePreviewResult {
  fileId: ApiId
  fileName: string
  previewType: FilePreviewType
  previewUrl?: string
  content?: string
  truncated?: boolean
  downloadUrl?: string
}
