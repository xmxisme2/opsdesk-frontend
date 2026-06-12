import { post } from '@/api/http'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type { TeamMemberVO, TeamVO } from '@/types/organization'

// 团队 API 为工单分派和团队看板提供基础数据，负责人规则由后端强制。
export interface TeamSearchRequest extends PageRequest {
  keyword?: string
  departmentId?: ApiId
  enabled?: boolean
}

export interface TeamMemberItemRequest {
  userId: ApiId
  leader: boolean
}

export interface TeamCreateRequest {
  name: string
  description?: string
  processingScope?: string
  departmentIds?: ApiId[]
  memberIds: ApiId[]
  leaderIds: ApiId[]
  enabled?: boolean
}

export interface TeamUpdateRequest {
  name: string
  description?: string
  processingScope?: string
  departmentIds?: ApiId[]
  enabled?: boolean
}

export function searchTeams(data: TeamSearchRequest) {
  return post<PageResult<TeamVO>>('/teams/search', data, { dedupe: 'cancel-previous', dedupeKey: 'teams:search' })
}

export function getTeamDetail(id: ApiId) {
  return post<TeamVO>(`/teams/${id}/detail`)
}

export function createTeam(data: TeamCreateRequest) {
  return post<TeamVO>('/teams/create', data, { dedupe: 'ignore-current', dedupeKey: 'teams:create' })
}

export function updateTeam(id: ApiId, data: TeamUpdateRequest) {
  return post<TeamVO>(`/teams/${id}/update`, data, { dedupe: 'ignore-current', dedupeKey: `teams:${id}:update` })
}

export function deleteTeam(id: ApiId) {
  return post<Record<string, never>>(`/teams/${id}/delete`, undefined, {
    dedupe: 'ignore-current',
    dedupeKey: `teams:${id}:delete`,
  })
}

export function searchTeamMembers(id: ApiId, data: PageRequest & { keyword?: string }) {
  return post<PageResult<TeamMemberVO>>(`/teams/${id}/members/search`, data, {
    dedupe: 'cancel-previous',
    dedupeKey: `teams:${id}:members`,
  })
}

export function updateTeamMembers(id: ApiId, members: TeamMemberItemRequest[]) {
  return post<TeamVO>(
    `/teams/${id}/members/update`,
    { members },
    { dedupe: 'ignore-current', dedupeKey: `teams:${id}:members:update` },
  )
}

export function updateTeamLeaders(id: ApiId, leaderIds: ApiId[]) {
  return post<TeamVO>(
    `/teams/${id}/leaders/update`,
    { leaderIds },
    { dedupe: 'ignore-current', dedupeKey: `teams:${id}:leaders:update` },
  )
}
