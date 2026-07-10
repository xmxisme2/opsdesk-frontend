import type { DashboardDistributionItem, DashboardSummary } from '@/types/dashboard'

export interface DashboardMetricItem {
  key: keyof DashboardSummary
  label: string
  value: string
  helper: string
  tone: 'primary' | 'warning' | 'success' | 'danger'
}

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: '紧急',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
}

const PRIORITY_ORDER = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

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

export function normalizePriorityDistribution(items: DashboardDistributionItem[]) {
  const valueMap = new Map(items.map((item) => [item.name, item.value]))
  const maxValue = Math.max(...items.map((item) => item.value), 1)
  return PRIORITY_ORDER.map((priority) => ({
    name: priority,
    label: PRIORITY_LABELS[priority],
    value: valueMap.get(priority) ?? 0,
    percent: Math.max(8, Math.round(((valueMap.get(priority) ?? 0) / maxValue) * 100)),
  }))
}
