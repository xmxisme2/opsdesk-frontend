import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { clearToken, getAccessToken, getRefreshToken, setAccessToken } from '@/utils/auth-token'
import { normalizeErrorMessage } from '@/utils/error-message'
import type { ApiResponse } from '@/types/api'
import type { LoginResult } from '@/types/auth'

export class OpsdeskApiError extends Error {
  code?: number

  constructor(message: string, code?: number) {
    super(message)
    this.name = 'OpsdeskApiError'
    this.code = code
  }
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

let refreshPromise: Promise<string> | null = null

export interface OpsdeskRequestConfig extends AxiosRequestConfig {
  silentError?: boolean
}

// 请求进入后端前统一注入 Bearer token，页面和业务 API 不直接拼接鉴权头。
http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

function canRefreshFor(url: string) {
  return !['/auth/login', '/auth/register', '/auth/captcha', '/auth/refresh', '/auth/sms-code/send'].some((path) => url.includes(path))
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new OpsdeskApiError('登录状态已失效', 401001)
  }
  if (!refreshPromise) {
    // 多个接口同时过期时，只发起一次 refresh 请求，避免刷新令牌被并发消费。
    refreshPromise = http
      .post<ApiResponse<LoginResult>>('/auth/refresh', { refreshToken })
      .then((response) => {
        if (response.data.code !== 200) {
          throw new OpsdeskApiError(normalizeErrorMessage(response.data), response.data.code)
        }
        setAccessToken(response.data.data.accessToken)
        return response.data.data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

async function executePost<T>(url: string, data: unknown, config: OpsdeskRequestConfig | undefined, allowRefresh: boolean): Promise<T> {
  const response = await http.post<ApiResponse<T>>(url, data, config)
  const payload = response.data
  if (payload.code === 200) {
    return payload.data
  }
  if (payload.code === 401001 && allowRefresh && canRefreshFor(url)) {
    try {
      await refreshAccessToken()
      return executePost<T>(url, data, config, false)
    } catch {
      clearToken()
    }
  }
  const message = normalizeErrorMessage(payload)
  if (payload.code === 401001) {
    clearToken()
  }
  if (!config?.silentError) {
    ElMessage.error(message)
  }
  throw new OpsdeskApiError(message, payload.code)
}

export async function post<T>(url: string, data?: unknown, config?: OpsdeskRequestConfig): Promise<T> {
  try {
    return await executePost<T>(url, data, config, true)
  } catch (error) {
    if (error instanceof OpsdeskApiError) {
      throw error
    }
    const axiosError = error as AxiosError<ApiResponse>
    if (axiosError.response?.data?.code === 401001 && canRefreshFor(url)) {
      try {
        await refreshAccessToken()
        return await executePost<T>(url, data, config, false)
      } catch {
        clearToken()
      }
    }
    const message = normalizeErrorMessage(axiosError.response?.data)
    if (!config?.silentError) {
      ElMessage.error(message)
    }
    throw new OpsdeskApiError(message, axiosError.response?.data?.code)
  }
}

export default http
