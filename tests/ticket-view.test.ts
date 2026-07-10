import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveTicketActions, formatTicketDueState, usesTeamMemberPicker } from '../src/utils/ticket-view.ts'
import type { TicketVO } from '../src/types/ticket.ts'

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

test('后端返回 availableActions 时直接采用后端结果', () => {
  const actions = resolveTicketActions(
    ticket({ status: 'PROCESSING', availableActions: ['transfer', 'complete'] }),
    undefined,
  )

  assert.deepEqual(actions, ['transfer', 'complete'])
})

test('后端未返回 availableActions 时保守地不展示动作', () => {
  assert.deepEqual(resolveTicketActions(ticket({ status: 'DRAFT' }), undefined), [])
  assert.deepEqual(resolveTicketActions(ticket({ status: 'PENDING_ASSIGN' }), undefined), [])
})

test('截止时间展示区分超时、剩余和空值', () => {
  const now = new Date('2026-06-22T10:00:00')
  assert.equal(formatTicketDueState(undefined, false, now).label, '-')
  assert.equal(formatTicketDueState('2026-06-22 09:30:00', true, now).label, '已超时 30 分钟')
  assert.equal(formatTicketDueState('2026-06-22 12:00:00', false, now).label, '剩余 2 小时')
})

test('终态工单不再按截止时间显示 SLA 超时', () => {
  const now = new Date('2026-06-22T10:00:00')

  assert.equal(formatTicketDueState('2026-06-22 09:30:00', true, 'CLOSED', now).label, '已关闭')
  assert.equal(formatTicketDueState('2026-06-22 09:30:00', true, 'CANCELLED', now).label, '已取消')
  assert.equal(formatTicketDueState('2026-06-22 09:30:00', false, 'PENDING_ASSIGN', now).label, '已超时 30 分钟')
})
test('可用动作数组会复制返回，避免页面侧修改后端响应对象', () => {
  const source = ['accept', 'complete'] as const
  const actions = resolveTicketActions(ticket({ availableActions: [...source] }), undefined)
  actions.pop()
  assert.deepEqual(source, ['accept', 'complete'])
})

test('只有分派和转派动作需要加载团队成员列表', () => {
  assert.equal(usesTeamMemberPicker('assign'), true)
  assert.equal(usesTeamMemberPicker('transfer'), true)
  assert.equal(usesTeamMemberPicker('complete'), false)
  assert.equal(usesTeamMemberPicker('confirm'), false)
})
