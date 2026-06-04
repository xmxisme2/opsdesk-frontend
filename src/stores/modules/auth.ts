import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { getCurrentUser, login as loginApi, logout as logoutApi } from '@/api/modules/auth'
import { clearToken, getAccessToken, setToken } from '@/utils/auth-token'
import type { LoginRequest } from '@/types/auth'
import type { UserRoleCode, UserVO } from '@/types/user'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<UserVO | null>(null)
  const accessToken = ref(getAccessToken())
  const loading = ref(false)

  const isLoggedIn = computed(() => Boolean(accessToken.value))
  const roleCodes = computed<UserRoleCode[]>(() => currentUser.value?.roles.map((role) => role.code) ?? [])
  const permissions = computed(() => currentUser.value?.permissions ?? [])

  async function login(data: LoginRequest) {
    loading.value = true
    try {
      const result = await loginApi(data)
      setToken(result.accessToken, result.refreshToken)
      accessToken.value = result.accessToken
      currentUser.value = result.user
      ElMessage.success('登录成功')
      return result
    } finally {
      loading.value = false
    }
  }

  async function fetchCurrentUser() {
    accessToken.value = getAccessToken()
    if (!accessToken.value) {
      currentUser.value = null
      return null
    }
    currentUser.value = await getCurrentUser()
    return currentUser.value
  }

  async function logout() {
    try {
      if (getAccessToken()) {
        await logoutApi()
      }
    } finally {
      currentUser.value = null
      accessToken.value = null
      clearToken()
    }
  }

  // 前端只保存当前用户上下文，资源范围和接口权限仍由后端最终校验。
  function hasRole(requiredRoles?: UserRoleCode[]) {
    if (!requiredRoles?.length) {
      return true
    }
    return requiredRoles.some((role) => roleCodes.value.includes(role))
  }

  function hasPermission(permission?: string) {
    if (!permission) {
      return true
    }
    return permissions.value.includes(permission)
  }

  return {
    currentUser,
    loading,
    isLoggedIn,
    roleCodes,
    permissions,
    login,
    fetchCurrentUser,
    logout,
    hasRole,
    hasPermission,
  }
})
