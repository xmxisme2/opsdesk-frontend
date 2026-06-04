import 'vue-router'
import type { UserRoleCode } from './user'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    roles?: UserRoleCode[]
    permission?: string
    hiddenInMenu?: boolean
    activeMenu?: string
    keepAlive?: boolean
    feature?: 'ai'
  }
}
