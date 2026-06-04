import { post } from '@/api/http'
import type { PermissionVO } from '@/types/role'

// 权限树同时覆盖菜单、按钮和接口权限，前端只做展示，后端仍需强校验。
export function getPermissionTree() {
  return post<PermissionVO[]>('/permissions/tree')
}
