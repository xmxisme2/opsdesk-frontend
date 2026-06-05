import { post } from '@/api/http'
import type { PermissionTreeRequest, PermissionVO } from '@/types/role'

// 权限树同时覆盖菜单、按钮和接口权限，前端只做展示和勾选，最终访问仍由后端强校验。
export function getPermissionTree(data?: PermissionTreeRequest) {
  return post<PermissionVO[]>('/permissions/tree', data)
}
