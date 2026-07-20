import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveTicketRouteQuery } from '../src/utils/ticket-route-query.ts'

test('工单列表只接收有效字符串路由筛选参数', () => {
  assert.deepEqual(
    resolveTicketRouteQuery({ ticketNo: 'IT20260710-103', keyword: '超时' }),
    { ticketNo: 'IT20260710-103', keyword: '超时' },
  )
  assert.deepEqual(resolveTicketRouteQuery({ ticketNo: ['A'], keyword: 1 }), { ticketNo: '', keyword: '' })
})
