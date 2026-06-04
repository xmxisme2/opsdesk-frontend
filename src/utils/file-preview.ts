import type { FileVO } from '@/types/file'

// 附件按钮展示必须以后端返回的预览标记为准，不用扩展名在页面中临时猜测。
export function canPreviewFile(file: Pick<FileVO, 'previewable' | 'previewType' | 'downloadOnly'>) {
  return file.previewable && !file.downloadOnly && file.previewType !== 'DOWNLOAD_ONLY'
}
