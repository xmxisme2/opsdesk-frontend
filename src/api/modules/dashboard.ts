import { post } from '@/api/http'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type {
  DashboardAgentRankingItem,
  DashboardDistributionItem,
  DashboardSummary,
  DashboardTrendPoint,
  WorkbenchSummary,
} from '@/types/dashboard'
import type { TicketListItemVO, TicketPriority } from '@/types/ticket'

// 看板接口按角色自动收敛数据范围，MANAGER 看本团队，ADMIN 可看全局。
export function getWorkbenchSummary(teamId?: ApiId) {
  return post<WorkbenchSummary>('/workbench/summary', { teamId })
}

export function getDashboardSummary(data: { teamId?: ApiId; dateFrom?: string; dateTo?: string }) {
  return post<DashboardSummary>('/dashboard/summary', data)
}

export function getDashboardTrends(data: { teamId?: ApiId; range?: '7d' | '30d'; dateFrom?: string; dateTo?: string }) {
  return post<{ points: DashboardTrendPoint[] }>('/dashboard/trends', data)
}

export function getDashboardDistributions(data: { teamId?: ApiId; dimension: 'category' | 'priority' | 'status'; dateFrom?: string; dateTo?: string }) {
  return post<{ dimension: string; items: DashboardDistributionItem[] }>('/dashboard/distributions', data)
}

export function getAgentRanking(data: { teamId?: ApiId; dateFrom?: string; dateTo?: string; limit?: number }) {
  return post<{ items: DashboardAgentRankingItem[] }>('/dashboard/agent-ranking', data)
}

export function getOverdueTickets(data: PageRequest & { teamId?: ApiId; priority?: TicketPriority }) {
  return post<PageResult<TicketListItemVO>>('/dashboard/overdue-tickets', data)
}
