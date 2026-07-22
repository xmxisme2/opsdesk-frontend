import { post } from '@/api/http'
import type { ApiId } from '@/types/api'
import type { AiSettings } from '@/types/ai'
import type { EmailNotificationSettings, NotificationTemplateVO, PriorityOption, SlaRuleMutationRequest, SlaRuleVO, UploadPolicy } from '@/types/system'

// 系统配置 API 负责 SLA、上传、通知和 AI 开关等后台配置，变更必须由后端记录审计日志。
export function searchSystemConfigs(data: { group?: string; keyword?: string }) {
  return post<{ key: string; value: string; group: string; description?: string; editable: boolean }[]>('/system/configs/search', data)
}

export function updateSystemConfig(key: string, value: string, reason?: string) {
  return post<{ key: string; value: string }>(`/system/configs/${key}/update`, { value, reason })
}

export function getPriorityOptions() {
  return post<PriorityOption[]>('/system/priorities/options', undefined, {
    dedupe: 'cancel-previous',
    dedupeKey: 'system:priorities:options',
  })
}

export function updatePriorityOptions(items: PriorityOption[]) {
  return post<PriorityOption[]>('/system/priorities/update', { items }, {
    dedupe: 'ignore-current',
    dedupeKey: 'system:priorities:update',
  })
}

export function getUploadPolicy() {
  return post<UploadPolicy>('/system/upload-policy/detail')
}

export function updateUploadPolicy(data: UploadPolicy) {
  return post<UploadPolicy>('/system/upload-policy/update', data)
}

// 邮件通知开启后，后端统一将通知投递至 defaultRecipient；SMTP 凭据仍仅由服务端环境配置提供。
export function getEmailNotificationSettings() {
  return post<EmailNotificationSettings>('/system/email-notification-settings/detail')
}

export function updateEmailNotificationSettings(data: EmailNotificationSettings) {
  return post<EmailNotificationSettings>('/system/email-notification-settings/update', data, {
    dedupe: 'ignore-current', dedupeKey: 'system:email-notification-settings:update',
  })
}

// 通知模板 API 仅维护现有模板，类型与渠道由初始化数据确定，页面不可擅自新增外部发送渠道。
export function searchNotificationTemplates(data: { type?: string; channel?: string }) {
  return post<NotificationTemplateVO[]>('/system/notification-templates/search', data)
}

export function updateNotificationTemplate(id: ApiId, data: Pick<NotificationTemplateVO, 'titleTemplate' | 'contentTemplate' | 'enabled'>) {
  return post<NotificationTemplateVO>(`/system/notification-templates/${id}/update`, data, { dedupe: 'ignore-current', dedupeKey: `notification-template:${id}:update` })
}

export function searchSlaRules(data: { categoryId?: ApiId; priority?: string; enabled?: boolean }) {
  return post<SlaRuleVO[]>('/system/sla-rules/search', data)
}

export function createSlaRule(data: SlaRuleMutationRequest) {
  return post<SlaRuleVO>('/system/sla-rules/create', data, { dedupe: 'ignore-current', dedupeKey: 'sla-rules:create' })
}

export function updateSlaRule(id: ApiId, data: SlaRuleMutationRequest) {
  return post<SlaRuleVO>(`/system/sla-rules/${id}/update`, data, { dedupe: 'ignore-current', dedupeKey: `sla-rules:${id}:update` })
}

export function deleteSlaRule(id: ApiId) {
  return post<Record<string, never>>(`/system/sla-rules/${id}/delete`, undefined, { dedupe: 'ignore-current', dedupeKey: `sla-rules:${id}:delete` })
}

export function getAiSettings() {
  return post<AiSettings>('/system/ai-settings/detail')
}

export function updateAiSettings(data: Partial<AiSettings> & { apiKey?: string }) {
  return post<AiSettings>('/system/ai-settings/update', data)
}
