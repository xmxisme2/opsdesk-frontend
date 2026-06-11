export type RequestDedupeMode = 'cancel-previous' | 'ignore-current'

type PendingRequest<T> = {
  controller: AbortController
  promise: Promise<T>
}

type RunDedupeRequestOptions<T> = {
  mode?: RequestDedupeMode
  key: string
  executor: (signal?: AbortSignal) => Promise<T>
}

const pendingRequests = new Map<string, PendingRequest<unknown>>()

// 默认 key 只用于兜底；业务模块应优先传入稳定 dedupeKey，避免 Body 字段顺序导致 key 不一致。
export function createRequestDedupeKey(method: string, url: string, data?: unknown) {
  return `${method.toUpperCase()}:${url}:${stableStringify(data)}`
}

// 请求去重只处理前端体验层面的重复请求，安全限流仍以后端 Redis 规则为准。
export function runDedupeRequest<T>({ mode, key, executor }: RunDedupeRequestOptions<T>): Promise<T> {
  if (!mode) {
    return executor()
  }

  const pending = pendingRequests.get(key) as PendingRequest<T> | undefined
  if (pending && mode === 'ignore-current') {
    return pending.promise
  }

  if (pending && mode === 'cancel-previous') {
    pending.controller.abort()
  }

  const controller = new AbortController()
  let promise: Promise<T>
  promise = executor(controller.signal).finally(() => {
    if (pendingRequests.get(key)?.promise === promise) {
      pendingRequests.delete(key)
    }
  })

  pendingRequests.set(key, { controller, promise })
  return promise
}

function stableStringify(value: unknown): string {
  if (value === undefined) {
    return ''
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`
}
