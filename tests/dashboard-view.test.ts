import assert from 'node:assert/strict'
import { buildDashboardMetrics, normalizePriorityDistribution } from '../src/utils/dashboard-view.ts'

// 数据看板指标需要保持和 Figma 首屏卡片顺序一致。
const metrics = buildDashboardMetrics({
  todayCreated: 6,
  pendingCount: 8,
  processingCount: 4,
  overdueCount: 2,
  avgProcessDuration: 3.76,
  completionRate: 50,
})

assert.deepEqual(
  metrics.map((item) => item.label),
  ['今日新增', '待处理', '平均处理', '完成率'],
)
assert.equal(metrics[2].value, '3.8h')
assert.equal(metrics[3].value, '50.0%')

const priorities = normalizePriorityDistribution([
  { name: 'MEDIUM', value: 10 },
  { name: 'URGENT', value: 5 },
])

assert.deepEqual(
  priorities.map((item) => item.label),
  ['紧急', '高', '中', '低'],
)
assert.equal(priorities[0].percent, 50)
assert.equal(priorities[1].value, 0)
