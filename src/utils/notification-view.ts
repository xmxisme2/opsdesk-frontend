import type { NotificationType, NotificationVO } from '@/types/notification'

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

// 通知业务跳转只开放已落地页面，避免跳转到未完成模块造成空路由体验。
export function resolveNotificationRoute(notification: NotificationVO) {
  if (notification.bizType === 'TICKET' && notification.bizId) {
    return { path: `/tickets/${notification.bizId}` }
  }
  return undefined
}
