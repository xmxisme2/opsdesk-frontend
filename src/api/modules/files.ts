import { post, postBlob } from '@/api/http'
import type { AxiosProgressEvent } from 'axios'
import type { ApiId } from '@/types/api'
import type { BizType, FilePreviewResult, FileVO } from '@/types/file'

// 文件上传走 multipart/form-data，预览按钮展示由 previewable、previewType、downloadOnly 三个字段决定。
export function uploadFile(data: { bizType: BizType; bizId?: ApiId; tempToken?: string; file: File; onUploadProgress?: (event: AxiosProgressEvent) => void }) {
  const formData = new FormData()
  formData.append('bizType', data.bizType)
  if (data.bizId) {
    formData.append('bizId', data.bizId)
  }
  if (data.tempToken) {
    formData.append('tempToken', data.tempToken)
  }
  formData.append('file', data.file)
  return post<FileVO>('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: data.onUploadProgress,
  })
}

export function searchFiles(data: { bizType: BizType; bizId?: ApiId; tempToken?: string }) {
  return post<FileVO[]>('/files/search', data)
}

export function previewFile(id: ApiId) {
  return post<FilePreviewResult>(`/files/${id}/preview`)
}

export function previewFileBlob(id: ApiId) {
  return postBlob(`/files/${id}/preview/content`)
}

export function deleteFile(id: ApiId, reason?: string) {
  return post<Record<string, never>>(`/files/${id}/delete`, { reason })
}

export function downloadFileBlob(id: ApiId) {
  return postBlob(`/files/${id}/download`)
}

export function getDownloadUrl(id: ApiId) {
  return `${import.meta.env.VITE_API_BASE_URL || '/api'}/files/${id}/download`
}
