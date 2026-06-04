import type { TicketListItemVO } from './ticket'

export interface WorkbenchSummary {
  todoCount: number
  createdCount: number
  assignedCount: number
  watchingCount: number
  unreadNotificationCount: number
  latestTickets: TicketListItemVO[]
  latestNotifications: unknown[]
}

export interface DashboardSummary {
  todayCreated: number
  pendingCount: number
  processingCount: number
  overdueCount: number
  avgProcessDuration: number
  completionRate: number
}
