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
  return post<PageResult<UserVO>>('/users/search', data, { dedupe: 'cancel-previous', dedupeKey: 'users:search' })
}

export function createUser(data: UserCreateRequest) {
  return post<UserVO>('/users/create', data, { dedupe: 'ignore-current', dedupeKey: 'users:create' })
}

export function getUserDetail(id: ApiId) {
  return post<UserVO>(`/users/${id}/detail`)
}

export function updateUser(id: ApiId, data: UserUpdateRequest) {
  return post<UserVO>(`/users/${id}/update`, data, { dedupe: 'ignore-current', dedupeKey: `users:${id}:update` })
}

export function updateUserStatus(id: ApiId, status: UserStatus, reason?: string) {
  const data: UserStatusUpdateRequest = { status, reason, kickoutSessions: true }
  return post<UserVO>(`/users/${id}/status`, data, { dedupe: 'ignore-current', dedupeKey: `users:${id}:status` })
}

// 管理员解除系统自动锁定时由后端同时清理该账号的连续登录失败计数。
export function unlockUser(id: ApiId) {
  return post<UserVO>(`/users/${id}/unlock`, undefined, { dedupe: 'ignore-current', dedupeKey: `users:${id}:unlock` })
}

export function updateUserRoles(id: ApiId, roleIds: ApiId[]) {
  return post<UserVO>(`/users/${id}/roles/update`, { roleIds }, { dedupe: 'ignore-current', dedupeKey: `users:${id}:roles` })
}

export function resetUserPassword(id: ApiId, newPassword?: string) {
  const data: UserResetPasswordRequest = { newPassword }
  return post<UserResetPasswordVO>(`/users/${id}/reset-password`, data, {
    dedupe: 'ignore-current',
    dedupeKey: `users:${id}:reset-password`,
  })
}

export function deleteUser(id: ApiId) {
  return post<Record<string, never>>(`/users/${id}/delete`, undefined, { dedupe: 'ignore-current', dedupeKey: `users:${id}:delete` })
}
