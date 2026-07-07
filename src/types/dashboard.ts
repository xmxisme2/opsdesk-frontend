import type { TicketListItemVO } from './ticket'
import type { NotificationVO } from './notification'

export interface WorkbenchSummary {
  todoCount: number
  createdCount: number
  assignedCount: number
  watchingCount: number
  unreadNotificationCount: number
  pendingAssignCount: number
  pendingProcessCount: number
  processingCount: number
  overdueCount: number
  latestTickets: TicketListItemVO[]
  latestNotifications: NotificationVO[]
}

export interface DashboardSummary {
  todayCreated: number
  pendingCount: number
  processingCount: number
  overdueCount: number
  avgProcessDuration: number
  completionRate: number
}
