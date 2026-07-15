import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createPriorityOptionsLoader,
  enabledPriorityOptions,
  loadPriorityOptionsSafely,
  normalizePriorityOptions,
  priorityDisplay,
  priorityTagStyle,
  validatePriorityConfiguration,
} from '../src/utils/priority-options.ts'

test('按排序返回启用优先级并保留历史显示配置', () => {
  const normalized = normalizePriorityOptions([
    { code: 'HIGH', name: '高优先', sort: 30, color: '#BA630F', enabled: false },
    { code: 'MEDIUM', name: '普通', sort: 20, color: '#1252AD', enabled: true },
  ])

  assert.deepEqual(enabledPriorityOptions(normalized).map((item) => item.code), ['LOW', 'MEDIUM', 'URGENT'])
  assert.equal(priorityDisplay(normalized, 'HIGH').name, '高优先')
  assert.equal(priorityDisplay(normalized, 'HIGH').color, '#BA630F')
})

test('忽略未知编码并用内置值防御坏名称、颜色和排序', () => {
  const normalized = normalizePriorityOptions([
    { code: 'UNKNOWN', name: '未知', sort: 0, color: '#000000', enabled: true },
    { code: 'LOW', name: '   ', sort: Number.NaN, color: 'red; color: transparent', enabled: false },
    { code: 'HIGH', name: '高', sort: 20, color: '#123456', enabled: true },
    { code: 'MEDIUM', name: '中', sort: 20, color: '#654321', enabled: true },
  ])

  assert.equal(normalized.length, 4)
  assert.deepEqual(normalized.map((item) => item.code), ['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  assert.equal(priorityDisplay(normalized, 'LOW').name, '低')
  assert.equal(priorityDisplay(normalized, 'LOW').color, '#64748B')
})

test('API 成功后归一化远端配置，已加载时仅 force 才重新请求', async () => {
  let callCount = 0
  const fetcher = async () => {
    callCount += 1
    return [{ code: 'URGENT', name: `特急${callCount}`, sort: 1, color: '#DC2626', enabled: true }]
  }

  const first = await loadPriorityOptionsSafely([], false, false, fetcher)
  const cached = await loadPriorityOptionsSafely(first.options, first.loaded, false, fetcher)
  const forced = await loadPriorityOptionsSafely(cached.options, cached.loaded, true, fetcher)

  assert.equal(priorityDisplay(first.options, 'URGENT').name, '特急1')
  assert.equal(priorityDisplay(cached.options, 'URGENT').name, '特急1')
  assert.equal(priorityDisplay(forced.options, 'URGENT').name, '特急2')
  assert.equal(callCount, 2)
})

test('API 失败时保留当前默认配置并吞掉错误', async () => {
  const defaults = normalizePriorityOptions([])
  const result = await loadPriorityOptionsSafely(defaults, false, false, async () => {
    throw new Error('network error')
  })

  assert.equal(result.loaded, true)
  assert.deepEqual(result.options, defaults)
})

test('PriorityTag 样式只暴露归一化后的颜色变量', () => {
  const display = priorityDisplay(normalizePriorityOptions([
    { code: 'HIGH', name: '高优先', sort: 30, color: '#BA630F', enabled: true },
  ]), 'HIGH')

  assert.deepEqual(priorityTagStyle(display), { '--priority-color': '#BA630F' })
})

test('加载中的 force 结果不会被晚返回的旧请求覆盖', async () => {
  const resolvers: Array<(items: unknown[]) => void> = []
  const loader = createPriorityOptionsLoader(() => new Promise((resolve) => resolvers.push(resolve)))

  const initialRequest = loader.load()
  const forcedRequest = loader.load(true)
  resolvers[1]([{ code: 'HIGH', name: '最新高', sort: 30, color: '#BA630F', enabled: true }])
  await forcedRequest
  resolvers[0]([{ code: 'HIGH', name: '旧高', sort: 30, color: '#D97706', enabled: true }])

  const finalResult = await initialRequest
  assert.equal(priorityDisplay(finalResult.options, 'HIGH').name, '最新高')
})

test('管理配置校验颜色、排序、启用项和 MEDIUM 规则', () => {
  const valid = normalizePriorityOptions([])
  assert.deepEqual(validatePriorityConfiguration(valid), [])

  const invalid = valid.map((item) => ({ ...item }))
  invalid[0].color = 'red'
  invalid[1].enabled = false
  invalid[2].sort = invalid[3].sort
  invalid[3].enabled = false

  assert.deepEqual(validatePriorityConfiguration(invalid), [
    'LOW 的颜色必须为六位十六进制色值',
    '优先级排序值不能重复',
    'MEDIUM 必须保持启用',
  ])
})
