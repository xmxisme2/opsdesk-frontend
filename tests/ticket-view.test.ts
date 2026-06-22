import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveTicketActions, formatTicketDueState } from '../src/utils/ticket-view.ts'
import type { TicketVO } from '../src/types/ticket.ts'
import type { UserVO } from '../src/types/user.ts'

function ticket(overrides: Partial<TicketVO>): TicketVO {
  return {
    id: '100',
    ticketNo: 'TK202606220001',
    title: 'VPN 无法连接',
    description: '客户端持续提示连接超时。',
    priority: 'URGENT',
    status: 'DRAFT',
    creatorId: '10',
    creatorName: '刘明',
    overdue: false,
    tags: [],
    watching: false,
    attachments: [],
    createdAt: '2026-06-22 09:00:00',
    updatedAt: '2026-06-22 09:00:00',
    ...overrides,
  }
}

function user(id: string, roles: string[]): UserVO {
  return {
    id,
    nickname: `用户${id}`,
    phone: `138000000${id}`,
    roles: roles.map((code, index) => ({ id: String(index + 1), code, name: code })),
    permissions: [],
    status: 'ACTIVE',
  }
}

test('后端返回 availableActions 时直接采用后端结果', () => {
  const actions = resolveTicketActions(
    ticket({ status: 'PROCESSING', availableActions: ['transfer', 'complete'] }),
    user('10', ['USER']),
  )

  assert.deepEqual(actions, ['transfer', 'complete'])
})

test('草稿创建人可提交和取消，其他用户没有动作', () => {
  assert.deepEqual(resolveTicketActions(ticket({ status: 'DRAFT' }), user('10', ['USER'])), ['submit', 'cancel'])
  assert.deepEqual(resolveTicketActions(ticket({ status: 'DRAFT' }), user('20', ['USER'])), [])
})

test('管理员可分派待分派工单，当前处理人可提交完成', () => {
  assert.deepEqual(resolveTicketActions(ticket({ status: 'PENDING_ASSIGN' }), user('20', ['ADMIN'])), ['assign', 'reject', 'cancel'])
  assert.deepEqual(
    resolveTicketActions(ticket({ status: 'PROCESSING', assigneeId: '20' }), user('20', ['AGENT'])),
    ['transfer', 'reject', 'complete'],
  )
})

test('截止时间展示区分超时、剩余和空值', () => {
  const now = new Date('2026-06-22T10:00:00')
  assert.equal(formatTicketDueState(undefined, false, now).label, '-')
  assert.equal(formatTicketDueState('2026-06-22 09:30:00', true, now).label, '已超时 30 分钟')
  assert.equal(formatTicketDueState('2026-06-22 12:00:00', false, now).label, '剩余 2 小时')
})
