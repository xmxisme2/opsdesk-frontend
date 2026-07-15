import { TICKET_PRIORITY_COLORS, TICKET_PRIORITY_LABELS, TICKET_PRIORITY_SORTS } from '../constants/ticket.ts'
import type { PriorityOption } from '../types/system.ts'
import type { TicketPriority } from '../types/ticket.ts'

const PRIORITY_CODES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
const SAFE_COLOR_PATTERN = /^#[0-9A-F]{6}$/i

function isTicketPriority(value: unknown): value is TicketPriority {
  return typeof value === 'string' && PRIORITY_CODES.includes(value as TicketPriority)
}

function defaultPriorityOptions(): PriorityOption[] {
  return PRIORITY_CODES.map((code) => ({
    code,
    name: TICKET_PRIORITY_LABELS[code],
    sort: TICKET_PRIORITY_SORTS[code],
    color: TICKET_PRIORITY_COLORS[code],
    enabled: true,
  }))
}

// 远端配置属于不可信输入：只接收固定编码，坏名称、颜色和排序回退到内置值，并始终补齐四项。
export function normalizePriorityOptions(items: readonly unknown[] | null | undefined): PriorityOption[] {
  const defaults = defaultPriorityOptions()
  const optionMap = new Map<TicketPriority, PriorityOption>(defaults.map((item) => [item.code, item]))

  for (const rawItem of Array.isArray(items) ? items : []) {
    if (!rawItem || typeof rawItem !== 'object') {
      continue
    }
    const item = rawItem as Record<string, unknown>
    if (!isTicketPriority(item.code)) {
      continue
    }
    const fallback = optionMap.get(item.code)!
    const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : fallback.name
    const color = typeof item.color === 'string' && SAFE_COLOR_PATTERN.test(item.color) ? item.color : fallback.color
    const sort = typeof item.sort === 'number' && Number.isFinite(item.sort) ? item.sort : fallback.sort
    optionMap.set(item.code, {
      code: item.code,
      name,
      sort,
      color,
      enabled: typeof item.enabled === 'boolean' ? item.enabled : fallback.enabled,
    })
  }

  // Map 保留内置顺序；sort 相同时依靠稳定排序维持 LOW/MEDIUM/HIGH/URGENT 的既定先后。
  return Array.from(optionMap.values()).sort((left, right) => left.sort - right.sort)
}

// 新建和筛选选项只暴露启用项；禁用项仍留在完整字典中供历史工单展示。
export function enabledPriorityOptions(items: readonly PriorityOption[]): PriorityOption[] {
  return items.filter((item) => item.enabled)
}

// 编辑草稿或既有规则时保留当前已停用项用于回显；新增场景仍只暴露启用项。
export function selectablePriorityOptions(
  items: readonly PriorityOption[],
  current?: TicketPriority,
): PriorityOption[] {
  const enabled = enabledPriorityOptions(items)
  if (!current || enabled.some((item) => item.code === current)) {
    return enabled
  }
  const historical = items.find((item) => item.code === current)
  return historical ? [...enabled, historical].sort((left, right) => left.sort - right.sort) : enabled
}

// 展示始终经过归一化，避免调用方传入残缺数组后出现空名称或不安全颜色。
export function priorityDisplay(items: readonly PriorityOption[], code: TicketPriority): PriorityOption {
  return normalizePriorityOptions(items).find((item) => item.code === code)!
}

export interface PriorityLoadResult {
  options: PriorityOption[]
  loaded: boolean
}

// Store 的加载策略下沉为可测试逻辑：已加载不重复请求，force 可刷新，失败只保留安全回退值。
export async function loadPriorityOptionsSafely(
  current: readonly PriorityOption[],
  loaded: boolean,
  force: boolean,
  fetcher: () => Promise<unknown>,
): Promise<PriorityLoadResult> {
  const safeCurrent = normalizePriorityOptions(current)
  if (loaded && !force) {
    return { options: safeCurrent, loaded: true }
  }
  try {
    const remote = await fetcher()
    return {
      options: normalizePriorityOptions(Array.isArray(remote) ? remote : []),
      loaded: true,
    }
  } catch {
    return { options: safeCurrent, loaded: true }
  }
}

// 请求版本守卫确保并发刷新时只有最后发起的请求可以更新缓存，避免旧响应覆盖 force 的新结果。
export function createPriorityOptionsLoader(fetcher: () => Promise<unknown>) {
  let current = normalizePriorityOptions([])
  let loaded = false
  let requestVersion = 0

  return {
    async load(force = false): Promise<PriorityLoadResult> {
      const currentVersion = ++requestVersion
      const result = await loadPriorityOptionsSafely(current, loaded, force, fetcher)
      if (currentVersion === requestVersion) {
        current = result.options
        loaded = result.loaded
      }
      return { options: current, loaded }
    },
  }
}

// PriorityTag 仅接收已归一化颜色，并通过单一 CSS 变量控制文本、边框与浅色背景。
export function priorityTagStyle(option: PriorityOption): Record<'--priority-color', string> {
  const color = SAFE_COLOR_PATTERN.test(option.color) ? option.color : TICKET_PRIORITY_COLORS[option.code]
  return { '--priority-color': color }
}

// 管理页保存前执行与后端一致的整组约束，错误数组可直接回显给管理员。
export function validatePriorityConfiguration(items: readonly PriorityOption[]): string[] {
  const errors: string[] = []
  for (const item of items) {
    if (!item.name.trim()) {
      errors.push(`${item.code} 的名称不能为空`)
    }
    if (!SAFE_COLOR_PATTERN.test(item.color)) {
      errors.push(`${item.code} 的颜色必须为六位十六进制色值`)
    }
  }
  if (new Set(items.map((item) => item.sort)).size !== items.length) {
    errors.push('优先级排序值不能重复')
  }
  if (!items.some((item) => item.enabled)) {
    errors.push('至少需要启用一个优先级')
  }
  if (!items.find((item) => item.code === 'MEDIUM')?.enabled) {
    errors.push('MEDIUM 必须保持启用')
  }
  return errors
}
