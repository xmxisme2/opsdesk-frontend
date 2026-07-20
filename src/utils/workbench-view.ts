import type { WorkbenchSummary } from '@/types/dashboard'

export type WorkbenchMetricTone = 'warning' | 'primary' | 'success' | 'danger'

export interface WorkbenchMetric {
  key: 'pendingAssign' | 'pendingProcess' | 'processing' | 'overdue'
  label: string
  value: number
  helper: string
  tone: WorkbenchMetricTone
}

export interface WorkbenchQuickAction {
  key: string
  label: string
  path?: string
  disabled?: boolean
}

// 工作台指标与 Figma 四张卡片一一对应，页面只负责渲染，不重复写业务字段映射。
export function buildWorkbenchMetrics(summary: WorkbenchSummary): WorkbenchMetric[] {
  return [
    {
      key: 'pendingAssign',
      label: '待分派',
      value: summary.pendingAssignCount,
      helper: `我创建 ${summary.createdCount} 张`,
      tone: 'warning',
    },
    {
      key: 'pendingProcess',
      label: '待处理',
      value: summary.pendingProcessCount,
      helper: `我处理 ${summary.assignedCount} 张`,
      tone: 'primary',
    },
    {
      key: 'processing',
      label: '处理中',
      value: summary.processingCount,
      helper: `待办合计 ${summary.todoCount} 张`,
      tone: 'success',
    },
    {
      key: 'overdue',
      label: '超时',
      value: summary.overdueCount,
      helper: '需要升级处理',
      tone: 'danger',
    },
  ]
}

// 快捷入口集中定义；知识草稿只能从具体终态工单生成，因此工作台提供知识库入口而不展示无上下文的草稿按钮。
export function buildWorkbenchQuickActions(): WorkbenchQuickAction[] {
  return [
    { key: 'createTicket', label: '创建工单', path: '/tickets/create' },
    { key: 'todoQueue', label: '待处理队列', path: '/tickets?status=PENDING_PROCESS' },
    { key: 'notifications', label: '通知中心', path: '/notifications' },
    { key: 'knowledge', label: '知识库', path: '/knowledge' },
    { key: 'dashboard', label: '查看团队看板', path: '/dashboard' },
  ]
}
