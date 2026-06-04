import { post } from '@/api/http'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type { UserStatus, UserVO } from '@/types/user'

// 用户管理 API 仅供管理员页面调用，启停和重置密码都必须由后端记录审计日志。
export function searchUsers(data: PageRequest & { keyword?: string; departmentId?: ApiId; roleCode?: string; status?: UserStatus }) {
  return post<PageResult<UserVO>>('/users/search', data)
}

export function createUser(data: Partial<UserVO> & { password: string; roleIds: ApiId[] }) {
  return post<UserVO>('/users/create', data)
}

export function getUserDetail(id: ApiId) {
  return post<UserVO>(`/users/${id}/detail`)
}

export function updateUser(id: ApiId, data: Partial<UserVO>) {
  return post<UserVO>(`/users/${id}/update`, data)
}

export function updateUserStatus(id: ApiId, status: UserStatus, reason?: string) {
  return post<UserVO>(`/users/${id}/status`, { status, reason, kickoutSessions: true })
}

export function updateUserRoles(id: ApiId, roleIds: ApiId[]) {
  return post<UserVO>(`/users/${id}/roles/update`, { roleIds })
}

export function resetUserPassword(id: ApiId, newPassword?: string) {
  return post<{ temporaryPassword: string }>(`/users/${id}/reset-password`, { newPassword })
}
