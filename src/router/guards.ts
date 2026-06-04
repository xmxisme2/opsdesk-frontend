import type { Router } from 'vue-router'
import { getAccessToken } from '@/utils/auth-token'
import { useAuthStore } from '@/stores/modules/auth'
import { usePermissionStore } from '@/stores/modules/permission'

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()
    const permissionStore = usePermissionStore()
    const hasToken = Boolean(getAccessToken())

    if (to.meta.requiresAuth && !hasToken) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    if ((to.name === 'login' || to.name === 'register') && hasToken) {
      return { name: 'workbench' }
    }

    if (hasToken && !authStore.currentUser) {
      try {
        await authStore.fetchCurrentUser()
      } catch {
        await authStore.logout()
        return { name: 'login', query: { redirect: to.fullPath } }
      }
    }

    if (to.meta.feature === 'ai' && !permissionStore.aiEnabled) {
      return { name: 'forbidden' }
    }

    if (!authStore.hasRole(to.meta.roles) || !authStore.hasPermission(to.meta.permission)) {
      return { name: 'forbidden' }
    }

    document.title = to.meta.title ? `${to.meta.title} - OpsDesk` : 'OpsDesk'
    return true
  })
}
