import assert from 'node:assert/strict'
import test from 'node:test'
import { auditBizTypeLabel, auditOperationTypeLabel } from '../src/utils/audit-view.ts'

test('审计日志展示将操作和业务编码转为中文', () => {
  assert.equal(auditOperationTypeLabel('RESET_PASSWORD'), '重置密码')
  assert.equal(auditBizTypeLabel('SYSTEM_CONFIG'), '系统配置')
})

test('审计日志展示保留未知编码并处理空值', () => {
  assert.equal(auditOperationTypeLabel('CUSTOM_OPERATION'), 'CUSTOM_OPERATION')
  assert.equal(auditBizTypeLabel(), '-')
})
