import { post } from '@/api/http'
import type { ApiId, PageResult } from '@/types/api'
import type {
  UserCreateRequest,
  UserResetPasswordRequest,
  UserResetPasswordVO,
  UserSearchRequest,
  UserStatus,
  UserStatusUpdateRequest,
  UserUpdateRequest,
  UserVO,
} from '@/types/user'

// 用户管理 API 仅供管理员页面调用，启停和重置密码都必须由后端记录审计日志。
export function searchUsers(data: UserSearchRequest) {
  return post<PageResult<UserVO>>('/users/search', data)
}

export function createUser(data: UserCreateRequest) {
  return post<UserVO>('/users/create', data)
}

export function getUserDetail(id: ApiId) {
  return post<UserVO>(`/users/${id}/detail`)
}

export function updateUser(id: ApiId, data: UserUpdateRequest) {
  return post<UserVO>(`/users/${id}/update`, data)
}

export function updateUserStatus(id: ApiId, status: UserStatus, reason?: string) {
  const data: UserStatusUpdateRequest = { status, reason, kickoutSessions: true }
  return post<UserVO>(`/users/${id}/status`, data)
}

export function updateUserRoles(id: ApiId, roleIds: ApiId[]) {
  return post<UserVO>(`/users/${id}/roles/update`, { roleIds })
}

export function resetUserPassword(id: ApiId, newPassword?: string) {
  const data: UserResetPasswordRequest = { newPassword }
  return post<UserResetPasswordVO>(`/users/${id}/reset-password`, data)
}

export function deleteUser(id: ApiId) {
  return post<Record<string, never>>(`/users/${id}/delete`)
}
