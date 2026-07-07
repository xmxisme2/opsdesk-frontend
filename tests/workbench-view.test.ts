import assert from 'node:assert/strict'
import test from 'node:test'
import { buildWorkbenchMetrics, buildWorkbenchQuickActions } from '../src/utils/workbench-view.ts'
import type { WorkbenchSummary } from '../src/types/dashboard.ts'

function summary(overrides: Partial<WorkbenchSummary> = {}): WorkbenchSummary {
  return {
    todoCount: 9,
    createdCount: 5,
    assignedCount: 6,
    watchingCount: 7,
    unreadNotificationCount: 8,
    pendingAssignCount: 2,
    pendingProcessCount: 3,
    processingCount: 4,
    overdueCount: 1,
    latestTickets: [],
    latestNotifications: [],
    ...overrides,
  }
}

test('buildWorkbenchMetrics 将摘要数据映射为 Figma 四张指标卡', () => {
  const metrics = buildWorkbenchMetrics(summary())

  assert.deepEqual(
    metrics.map((item) => [item.key, item.label, item.value, item.tone]),
    [
      ['pendingAssign', '待分派', 2, 'warning'],
      ['pendingProcess', '待处理', 3, 'primary'],
      ['processing', '处理中', 4, 'success'],
      ['overdue', '超时', 1, 'danger'],
    ],
  )
})

test('buildWorkbenchQuickActions 保留已落地入口并标记延后能力', () => {
  const actions = buildWorkbenchQuickActions()

  assert.equal(actions[0].path, '/tickets/create')
  assert.equal(actions.find((item) => item.key === 'knowledgeDraft')?.disabled, true)
  assert.equal(actions.find((item) => item.key === 'dashboard')?.path, '/dashboard')
})
