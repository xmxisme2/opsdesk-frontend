import { post } from '@/api/http'
import type { ApiId } from '@/types/api'
import type { DepartmentVO } from '@/types/organization'

export interface DepartmentTreeRequest {
  keyword?: string
  enabled?: boolean
}

export interface DepartmentMutationRequest {
  parentId?: ApiId
  name: string
  leaderId?: ApiId
  sort?: number
  enabled?: boolean
}

// 部门 API 用于注册、用户管理和组织配置，删除前的业务校验由后端完成。
export function getDepartmentTree(data: DepartmentTreeRequest = { enabled: true }) {
  return post<DepartmentVO[]>('/departments/tree', data, {
    dedupe: 'cancel-previous',
    dedupeKey: 'departments:tree',
  })
}

export function getDepartmentDetail(id: ApiId) {
  return post<DepartmentVO>(`/departments/${id}/detail`)
}

export function createDepartment(data: DepartmentMutationRequest) {
  return post<DepartmentVO>('/departments/create', data, {
    dedupe: 'ignore-current',
    dedupeKey: 'departments:create',
  })
}

export function updateDepartment(id: ApiId, data: DepartmentMutationRequest) {
  return post<DepartmentVO>(`/departments/${id}/update`, data, {
    dedupe: 'ignore-current',
    dedupeKey: `departments:${id}:update`,
  })
}

export function deleteDepartment(id: ApiId) {
  return post<Record<string, never>>(`/departments/${id}/delete`, undefined, {
    dedupe: 'ignore-current',
    dedupeKey: `departments:${id}:delete`,
  })
}
