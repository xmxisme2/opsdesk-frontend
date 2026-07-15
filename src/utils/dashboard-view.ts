import type { DashboardDistributionItem, DashboardSummary } from '@/types/dashboard'
import type { PriorityOption } from '@/types/system'

export interface DashboardMetricItem {
  key: keyof DashboardSummary
  label: string
  value: string
  helper: string
  tone: 'primary' | 'warning' | 'success' | 'danger'
}

// 数据看板指标映射集中维护，避免页面模板里散落统计字段含义。
export function buildDashboardMetrics(summary: DashboardSummary): DashboardMetricItem[] {
  return [
    {
      key: 'todayCreated',
      label: '今日新增',
      value: String(summary.todayCreated),
      helper: '当天创建工单',
      tone: 'primary',
    },
    {
      key: 'pendingCount',
      label: '待处理',
      value: String(summary.pendingCount),
      helper: '当前待分派与待处理',
      tone: 'warning',
    },
    {
      key: 'avgProcessDuration',
      label: '平均处理',
      value: `${summary.avgProcessDuration.toFixed(1)}h`,
      helper: '完成工单平均耗时',
      tone: 'success',
    },
    {
      key: 'completionRate',
      label: '完成率',
      value: `${summary.completionRate.toFixed(1)}%`,
      helper: '已完成 / 总工单',
      tone: 'danger',
    },
  ]
}

// 优先级分布使用管理员配置的名称、颜色和排序；停用项仍保留历史统计展示。
export function normalizePriorityDistribution(
  items: DashboardDistributionItem[],
  priorityOptions: readonly PriorityOption[],
) {
  const valueMap = new Map(items.map((item) => [item.name, item.value]))
  const maxValue = Math.max(...items.map((item) => item.value), 1)
  return priorityOptions.map((priority) => ({
    name: priority.code,
    label: priority.name,
    color: priority.color,
    value: valueMap.get(priority.code) ?? 0,
    percent: Math.max(8, Math.round(((valueMap.get(priority.code) ?? 0) / maxValue) * 100)),
  }))
}
