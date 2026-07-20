import type { OptionItem } from '@/types/api'
import type { TicketAction, TicketPriority, TicketStatus } from '@/types/ticket'

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  DRAFT: '草稿',
  PENDING_ASSIGN: '待分派',
  PENDING_PROCESS: '待处理',
  PROCESSING: '处理中',
  PENDING_CONFIRM: '待确认',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
  CANCELLED: '已取消',
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '紧急',
}

// 内置颜色用于接口未加载或返回坏数据时回退，值仅用于界面展示，不允许作为业务编码提交。
export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  LOW: '#64748B',
  MEDIUM: '#2563EB',
  HIGH: '#D97706',
  URGENT: '#DC2626',
}

// 内置排序保证远端缺项时仍能稳定生成完整的四级优先级字典。
export const TICKET_PRIORITY_SORTS: Record<TicketPriority, number> = {
  LOW: 10,
  MEDIUM: 20,
  HIGH: 30,
  URGENT: 40,
}

export const TICKET_STATUS_OPTIONS: OptionItem[] = Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({
  label,
  value,
}))

export const TICKET_PRIORITY_OPTIONS: OptionItem[] = Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({
  label,
  value,
}))

export const TICKET_ACTION_LABELS: Record<TicketAction, string> = {
  submit: '提交工单',
  assign: '分派',
  reject: '驳回',
  accept: '接单',
  transfer: '转派',
  complete: '提交完成',
  confirm: '确认完成',
  reopen: '重新打开',
  close: '关闭',
  cancel: '取消',
}
