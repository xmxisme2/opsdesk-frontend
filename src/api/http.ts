import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { clearToken, getAccessToken, getRefreshToken, setAccessToken } from '@/utils/auth-token'
import { normalizeErrorMessage } from '@/utils/error-message'
import { createRequestDedupeKey, runDedupeRequest, type RequestDedupeMode } from '@/utils/request-dedupe'
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
  dedupe?: RequestDedupeMode
  dedupeKey?: string
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

function toAxiosConfig(config: OpsdeskRequestConfig | undefined, signal?: AbortSignal): AxiosRequestConfig | undefined {
  if (!config && !signal) {
    return undefined
  }
  const axiosConfig: OpsdeskRequestConfig = { ...(config ?? {}) }
  delete axiosConfig.silentError
  delete axiosConfig.dedupe
  delete axiosConfig.dedupeKey
  return {
    ...axiosConfig,
    signal: axiosConfig.signal ?? signal,
  }
}

async function executePost<T>(
  url: string,
  data: unknown,
  config: OpsdeskRequestConfig | undefined,
  allowRefresh: boolean,
  signal?: AbortSignal,
): Promise<T> {
  const response = await http.post<ApiResponse<T>>(url, data, toAxiosConfig(config, signal))
  const payload = response.data
  if (payload.code === 200) {
    return payload.data
  }
  if (payload.code === 401001 && allowRefresh && canRefreshFor(url)) {
    try {
      await refreshAccessToken()
      return executePost<T>(url, data, config, false, signal)
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

async function postWithRefresh<T>(url: string, data: unknown, config: OpsdeskRequestConfig | undefined, signal?: AbortSignal): Promise<T> {
  try {
    return await executePost<T>(url, data, config, true, signal)
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error
    }
    if (error instanceof OpsdeskApiError) {
      throw error
    }
    const axiosError = error as AxiosError<ApiResponse>
    if (axiosError.response?.data?.code === 401001 && canRefreshFor(url)) {
      try {
        await refreshAccessToken()
        return await executePost<T>(url, data, config, false, signal)
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

async function parseBlobApiResponse(blob: Blob): Promise<ApiResponse | null> {
  if (!blob.type.includes('application/json')) {
    return null
  }
  try {
    return JSON.parse(await blob.text()) as ApiResponse
  } catch {
    return null
  }
}

async function executePostBlob(
  url: string,
  data: unknown,
  config: OpsdeskRequestConfig | undefined,
  allowRefresh: boolean,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await http.post<Blob>(url, data, {
    ...toAxiosConfig(config, signal),
    responseType: 'blob',
  })
  const payload = await parseBlobApiResponse(response.data)
  if (!payload) {
    return response.data
  }
  if (payload.code === 200) {
    return response.data
  }
  if (payload.code === 401001 && allowRefresh && canRefreshFor(url)) {
    try {
      await refreshAccessToken()
      return executePostBlob(url, data, config, false, signal)
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

async function postBlobWithRefresh(url: string, data: unknown, config: OpsdeskRequestConfig | undefined, signal?: AbortSignal): Promise<Blob> {
  try {
    return await executePostBlob(url, data, config, true, signal)
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error
    }
    if (error instanceof OpsdeskApiError) {
      throw error
    }
    const axiosError = error as AxiosError<ApiResponse | Blob>
    const blobPayload = axiosError.response?.data instanceof Blob
      ? await parseBlobApiResponse(axiosError.response.data)
      : null
    if (blobPayload?.code === 401001 && canRefreshFor(url)) {
      try {
        await refreshAccessToken()
        return await executePostBlob(url, data, config, false, signal)
      } catch {
        clearToken()
      }
    }
    const responsePayload = blobPayload ?? (axiosError.response?.data as ApiResponse | undefined)
    const message = normalizeErrorMessage(responsePayload)
    if (!config?.silentError) {
      ElMessage.error(message)
    }
    throw new OpsdeskApiError(message, responsePayload?.code)
  }
}

export function isRequestCanceled(error: unknown) {
  return axios.isCancel(error)
}

export function post<T>(url: string, data?: unknown, config?: OpsdeskRequestConfig): Promise<T> {
  const dedupeKey = config?.dedupeKey ?? createRequestDedupeKey('POST', url, data)
  // HTTP 层只做前端体验治理：列表查询可取消旧请求，动作接口可忽略重复提交；安全限流仍以后端为准。
  return runDedupeRequest<T>({
    mode: config?.dedupe,
    key: dedupeKey,
    executor: (signal) => postWithRefresh<T>(url, data, config, signal),
  })
}

export function postBlob(url: string, data?: unknown, config?: OpsdeskRequestConfig): Promise<Blob> {
  const dedupeKey = config?.dedupeKey ?? createRequestDedupeKey('POST', url, data)
  // 文件流请求仍复用统一 HTTP 层，确保 Bearer token、refresh 和业务错误提示一致。
  return runDedupeRequest<Blob>({
    mode: config?.dedupe,
    key: dedupeKey,
    executor: (signal) => postBlobWithRefresh(url, data, config, signal),
  })
}

export default http
