import { post } from '@/api/http'
import type { PageRequest, PageResult, ApiId } from '@/types/api'
import type { NotificationType, NotificationVO } from '@/types/notification'

// 通知接口只查询当前登录用户数据，未读数可由后端 Redis 缓存提供。
export function searchNotifications(data: PageRequest & { read?: boolean; type?: NotificationType; createdFrom?: string; createdTo?: string }) {
  return post<PageResult<NotificationVO>>('/notifications/search', data)
}

export function getUnreadCount() {
  return post<{ count: number }>('/notifications/unread-count')
}

export function markNotificationRead(id: ApiId) {
  return post<NotificationVO>(`/notifications/${id}/read`)
}

export function markAllNotificationsRead(type?: NotificationType) {
  return post<{ updatedCount: number }>('/notifications/read-all', { type })
}
