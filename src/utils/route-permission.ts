import type { MenuConfig } from '@/constants/permissions'
import type { UserRoleCode } from '@/types/user'

export function hasAnyRole(userRoles: UserRoleCode[], requiredRoles?: UserRoleCode[]) {
  if (!requiredRoles?.length) {
    return true
  }
  return requiredRoles.some((role) => userRoles.includes(role))
}

// 菜单过滤同时考虑角色和功能开关，避免 AI 关闭时仍暴露入口。
export function filterMenusByPermission(menus: MenuConfig[], roles: UserRoleCode[], aiEnabled: boolean): MenuConfig[] {
  return menus
    .filter((menu) => hasAnyRole(roles, menu.roles))
    .filter((menu) => menu.feature !== 'ai' || aiEnabled)
    .map((menu) => ({
      ...menu,
      children: menu.children ? filterMenusByPermission(menu.children, roles, aiEnabled) : undefined,
    }))
    .filter((menu) => !menu.children || menu.children.length > 0)
}
