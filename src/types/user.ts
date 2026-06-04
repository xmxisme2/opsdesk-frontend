import type { ApiId } from './api'

export type UserRoleCode = 'USER' | 'AGENT' | 'MANAGER' | 'ADMIN'
export type UserStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED'
export type UserGender = 'MALE' | 'FEMALE'

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
