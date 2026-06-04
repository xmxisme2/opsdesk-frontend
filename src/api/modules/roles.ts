import { post } from '@/api/http'
import type { ApiId, PageRequest, PageResult } from '@/types/api'
import type { RoleVO } from '@/types/role'

// 角色接口负责 RBAC 角色维护，权限缓存清理由后端在保存后完成。
export function searchRoles(data: PageRequest & { keyword?: string; enabled?: boolean }) {
  return post<PageResult<RoleVO>>('/roles/search', data)
}

export function createRole(data: Omit<RoleVO, 'id' | 'builtIn' | 'createdAt' | 'updatedAt'>) {
  return post<RoleVO>('/roles/create', data)
}

export function getRoleDetail(id: ApiId) {
  return post<RoleVO>(`/roles/${id}/detail`)
}

export function updateRole(id: ApiId, data: Partial<RoleVO>) {
  return post<RoleVO>(`/roles/${id}/update`, data)
}

export function deleteRole(id: ApiId) {
  return post<Record<string, never>>(`/roles/${id}/delete`)
}

export function updateRolePermissions(id: ApiId, permissionIds: ApiId[]) {
  return post<RoleVO>(`/roles/${id}/permissions/update`, { permissionIds })
}
