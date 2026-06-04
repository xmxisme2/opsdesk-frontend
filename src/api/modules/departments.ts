import { post } from '@/api/http'
import type { ApiId } from '@/types/api'
import type { DepartmentVO } from '@/types/organization'

// 部门 API 用于注册、用户管理和组织配置，删除前的业务校验由后端完成。
export function getDepartmentTree(enabled?: boolean) {
  return post<DepartmentVO[]>('/departments/tree', { enabled })
}

export function createDepartment(data: Partial<DepartmentVO>) {
  return post<DepartmentVO>('/departments/create', data)
}

export function updateDepartment(id: ApiId, data: Partial<DepartmentVO>) {
  return post<DepartmentVO>(`/departments/${id}/update`, data)
}

export function deleteDepartment(id: ApiId) {
  return post<Record<string, never>>(`/departments/${id}/delete`)
}
