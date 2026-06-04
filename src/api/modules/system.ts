import { post } from '@/api/http'
import type { ApiId } from '@/types/api'
import type { AiSettings } from '@/types/ai'
import type { PriorityOption, SlaRuleVO, UploadPolicy } from '@/types/system'

// 系统配置 API 负责 SLA、上传、通知和 AI 开关等后台配置，变更必须由后端记录审计日志。
export function searchSystemConfigs(data: { group?: string; keyword?: string }) {
  return post<{ key: string; value: string; group: string; description?: string; editable: boolean }[]>('/system/configs/search', data)
}

export function updateSystemConfig(key: string, value: string, reason?: string) {
  return post<{ key: string; value: string }>(`/system/configs/${key}/update`, { value, reason })
}

export function getPriorityOptions() {
  return post<PriorityOption[]>('/system/priorities/options')
}

export function updatePriorityOptions(items: PriorityOption[]) {
  return post<{ items: PriorityOption[] }>('/system/priorities/update', { items })
}

export function getUploadPolicy() {
  return post<UploadPolicy>('/system/upload-policy/detail')
}

export function updateUploadPolicy(data: UploadPolicy) {
  return post<UploadPolicy>('/system/upload-policy/update', data)
}

export function searchSlaRules(data: { categoryId?: ApiId; priority?: string; enabled?: boolean }) {
  return post<SlaRuleVO[]>('/system/sla-rules/search', data)
}

export function getAiSettings() {
  return post<AiSettings>('/system/ai-settings/detail')
}

export function updateAiSettings(data: Partial<AiSettings> & { apiKey?: string }) {
  return post<AiSettings>('/system/ai-settings/update', data)
}
