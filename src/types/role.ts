import type { ApiId } from './api'

export type PermissionType = 'MENU' | 'BUTTON' | 'API'

export interface RoleSearchRequest {
  page?: number
  size?: number
  keyword?: string
  enabled?: boolean
}

export interface RoleCreateRequest {
  code: string
  name: string
  description?: string
  enabled?: boolean
  permissionIds?: ApiId[]
}

export interface RoleUpdateRequest {
  name: string
  description?: string
  enabled?: boolean
  permissionIds?: ApiId[]
}

export interface RolePermissionUpdateRequest {
  permissionIds: ApiId[]
}

export interface RoleVO {
  id: ApiId
  code: string
  name: string
  description?: string
  builtIn: boolean
  enabled: boolean
  permissionIds: ApiId[]
  createdAt?: string
  updatedAt?: string
}

export interface PermissionTreeRequest {
  type?: PermissionType
  enabled?: boolean
}

export interface PermissionVO {
  id: ApiId
  code: string
  name: string
  type: PermissionType
  parentId?: ApiId
  path?: string
  method?: string
  sort: number
  enabled: boolean
  children?: PermissionVO[]
}
