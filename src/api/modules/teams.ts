import { post } from '@/api/http'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type { TeamVO } from '@/types/organization'

// 团队 API 为工单分派和团队看板提供基础数据，负责人规则由后端强制。
export function searchTeams(data: PageRequest & { keyword?: string; enabled?: boolean }) {
  return post<PageResult<TeamVO>>('/teams/search', data)
}

export function createTeam(data: Partial<TeamVO>) {
  return post<TeamVO>('/teams/create', data)
}

export function updateTeam(id: ApiId, data: Partial<TeamVO>) {
  return post<TeamVO>(`/teams/${id}/update`, data)
}

export function deleteTeam(id: ApiId) {
  return post<Record<string, never>>(`/teams/${id}/delete`)
}
