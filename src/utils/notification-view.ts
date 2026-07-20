import type { NotificationType, NotificationVO } from '@/types/notification'
import { TICKET_STATUS_LABELS } from '../constants/ticket.ts'
import type { TicketStatus } from '../types/ticket.ts'

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  TICKET_ASSIGNED: '工单分派',
  TICKET_COMMENTED: '工单评论',
  TICKET_STATUS_CHANGED: '状态变更',
  TICKET_OVERDUE: '超时提醒',
  TICKET_CLOSED: '关闭通知',
}

// 通知类型中文释义集中在工具层，页面和测试共享同一套业务文案。
export function notificationTypeLabel(type: NotificationType) {
  return NOTIFICATION_TYPE_LABELS[type] ?? type
}

// 历史通知可能已将工单状态编码直接落库；展示时统一替换为中文，保证新旧通知文案一致。
export function notificationDisplayText(text?: string) {
  if (!text) {
    return text ?? ''
  }
  return text.replace(/\b(DRAFT|PENDING_ASSIGN|PENDING_PROCESS|PROCESSING|PENDING_CONFIRM|COMPLETED|CLOSED|CANCELLED)\b/g,
    (status) => TICKET_STATUS_LABELS[status as TicketStatus] ?? status)
}

// 通知业务跳转只开放已落地页面，避免跳转到未完成模块造成空路由体验。
export function resolveNotificationRoute(notification: NotificationVO) {
  if (notification.bizType === 'TICKET' && notification.bizId) {
    return { path: `/tickets/${notification.bizId}` }
  }
  return undefined
}
