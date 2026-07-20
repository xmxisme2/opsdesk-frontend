import assert from 'node:assert/strict'
import test from 'node:test'
import { notificationDisplayText, notificationTypeLabel, resolveNotificationRoute } from '../src/utils/notification-view.ts'
import type { NotificationVO } from '../src/types/notification.ts'

function notification(overrides: Partial<NotificationVO>): NotificationVO {
  return {
    id: '1',
    receiverId: '10',
    type: 'TICKET_ASSIGNED',
    title: '工单已分派',
    content: 'TK202607010001 已分派给你',
    bizType: 'TICKET',
    bizId: '100',
    read: false,
    createdAt: '2026-07-01 09:00:00',
    ...overrides,
  }
}

test('notificationTypeLabel 将通知类型转为中文业务释义', () => {
  assert.equal(notificationTypeLabel('TICKET_ASSIGNED'), '工单分派')
  assert.equal(notificationTypeLabel('TICKET_COMMENTED'), '工单评论')
  assert.equal(notificationTypeLabel('TICKET_OVERDUE'), '超时提醒')
})

test('notificationDisplayText 将历史通知中的工单状态编码转为中文名称', () => {
  assert.equal(notificationDisplayText('工单 IT20260710-201 当前状态为 PENDING_CONFIRM'), '工单 IT20260710-201 当前状态为 待确认')
  assert.equal(notificationDisplayText('PROCESSING -> COMPLETED'), '处理中 -> 已完成')
  assert.equal(notificationDisplayText('状态正常'), '状态正常')
})

test('resolveNotificationRoute 按业务类型跳转详情页', () => {
  assert.deepEqual(resolveNotificationRoute(notification({ bizType: 'TICKET', bizId: '100' })), {
    path: '/tickets/100',
  })
  assert.equal(resolveNotificationRoute(notification({ bizType: 'KNOWLEDGE', bizId: '200' })), undefined)
})
