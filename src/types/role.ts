import type { ApiId } from './api'

export type PermissionType = 'MENU' | 'BUTTON' | 'API'

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
