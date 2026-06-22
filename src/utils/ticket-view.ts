import type { TicketAction, TicketVO } from '../types/ticket.ts'
import type { UserVO } from '../types/user.ts'

export interface TicketDueState {
  label: string
  tone: 'normal' | 'warning' | 'danger'
}

function roleSet(user: UserVO | null | undefined) {
  return new Set(user?.roles.map((role) => role.code) ?? [])
}

function isAgentOrAbove(roles: Set<string>) {
  return roles.has('AGENT') || roles.has('MANAGER') || roles.has('ADMIN')
}

/**
 * 解析详情页可用动作。后端返回 availableActions 时完全采用后端结果；
 * 当前后端尚未返回该字段时，按已确认状态机做保守兜底，最终仍由后端校验权限。
 */
export function resolveTicketActions(ticket: TicketVO, currentUser: UserVO | null | undefined): TicketAction[] {
  if (ticket.availableActions?.length) {
    return [...ticket.availableActions]
  }
  if (!currentUser) {
    return []
  }

  const roles = roleSet(currentUser)
  const isCreator = currentUser.id === ticket.creatorId
  const isAssignee = currentUser.id === ticket.assigneeId
  const isAdmin = roles.has('ADMIN')
  const isManager = roles.has('MANAGER') || isAdmin

  switch (ticket.status) {
    case 'DRAFT':
      return isCreator ? ['submit', 'cancel'] : []
    case 'PENDING_ASSIGN': {
      const actions: TicketAction[] = []
      if (isManager) {
        actions.push('assign', 'reject')
      }
      if (isCreator || isAdmin) {
        actions.push('cancel')
      }
      return actions
    }
    case 'PENDING_PROCESS':
      return isAgentOrAbove(roles) ? ['accept', 'transfer'] : []
    case 'PROCESSING':
      return isAssignee ? ['transfer', 'reject', 'complete'] : isManager ? ['transfer'] : []
    case 'PENDING_CONFIRM':
      return isCreator ? ['confirm', 'reopen'] : []
    case 'COMPLETED':
      return isCreator || isManager ? ['close'] : []
    default:
      return []
  }
}

function parseDateTime(value: string) {
  return new Date(value.includes('T') ? value : value.replace(' ', 'T'))
}

/**
 * 将截止时间转换为列表可直接展示的 SLA 文案，避免每个页面重复计算。
 */
export function formatTicketDueState(dueTime?: string, overdue = false, now = new Date()): TicketDueState {
  if (!dueTime) {
    return { label: '-', tone: 'normal' }
  }
  const dueAt = parseDateTime(dueTime)
  if (Number.isNaN(dueAt.getTime())) {
    return { label: dueTime, tone: overdue ? 'danger' : 'normal' }
  }

  const minutes = Math.max(0, Math.round(Math.abs(dueAt.getTime() - now.getTime()) / 60_000))
  const amount = minutes >= 60 ? `${Math.floor(minutes / 60)} 小时` : `${minutes} 分钟`
  if (overdue || dueAt.getTime() < now.getTime()) {
    return { label: `已超时 ${amount}`, tone: 'danger' }
  }
  return { label: `剩余 ${amount}`, tone: minutes <= 120 ? 'warning' : 'normal' }
}
