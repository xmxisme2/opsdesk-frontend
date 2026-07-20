import type { ApiId } from './api'

export type UserRoleCode = 'USER' | 'AGENT' | 'MANAGER' | 'ADMIN' | (string & {})
export type UserStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED'
export type UserGender = 'MALE' | 'FEMALE'

export interface UserSearchRequest {
  page?: number
  size?: number
  keyword?: string
  departmentId?: ApiId
  roleCode?: string
  status?: UserStatus
}

export interface UserCreateRequest {
  phone: string
  username?: string
  password: string
  nickname: string
  email?: string
  gender?: UserGender
  avatarCode?: string
  departmentId: ApiId
  status?: UserStatus
  roleIds: ApiId[]
}

export interface UserUpdateRequest {
  nickname?: string
  email?: string
  phone?: string
  gender?: UserGender
  avatarCode?: string
  departmentId?: ApiId
  status?: UserStatus
}

export interface UserStatusUpdateRequest {
  status: UserStatus
  reason?: string
  kickoutSessions?: boolean
}

export interface UserResetPasswordRequest {
  newPassword?: string
}

export interface UserResetPasswordVO {
  temporaryPassword: string
}

export interface UserRole {
  id: ApiId
  code: UserRoleCode
  name: string
}

export interface UserVO {
  id: ApiId
  username?: string
  nickname: string
  email?: string
  phone: string
  gender?: UserGender
  avatarCode?: string
  avatarUrl?: string
  departmentId?: ApiId
  departmentName?: string
  roles: UserRole[]
  permissions: string[]
  status: UserStatus
  createdAt?: string
  updatedAt?: string
}
