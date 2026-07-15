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
], [
  { code: 'LOW', name: '一般', sort: 10, color: '#0D8052', enabled: true },
  { code: 'MEDIUM', name: '普通', sort: 20, color: '#1252AD', enabled: true },
  { code: 'HIGH', name: '重要', sort: 30, color: '#BA630F', enabled: false },
  { code: 'URGENT', name: '特急', sort: 40, color: '#C71F24', enabled: true },
])

assert.deepEqual(
  priorities.map((item) => item.label),
  ['一般', '普通', '重要', '特急'],
)
assert.equal(priorities[0].color, '#0D8052')
assert.equal(priorities[2].value, 0)
assert.equal(priorities[3].percent, 50)
