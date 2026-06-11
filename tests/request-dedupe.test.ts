import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDebouncedFn } from '../src/utils/debounce.ts'
import { runDedupeRequest } from '../src/utils/request-dedupe.ts'

test('ignore-current 复用同一个进行中的请求', async () => {
  let callCount = 0
  const first = runDedupeRequest({
    mode: 'ignore-current',
    key: 'users:create',
    executor: async () => {
      callCount += 1
      await new Promise((resolve) => setTimeout(resolve, 20))
      return 'created'
    },
  })
  const second = runDedupeRequest({
    mode: 'ignore-current',
    key: 'users:create',
    executor: async () => {
      callCount += 1
      return 'duplicated'
    },
  })

  assert.equal(await first, 'created')
  assert.equal(await second, 'created')
  assert.equal(callCount, 1)
})

test('cancel-previous 会中止相同 key 的上一条请求', async () => {
  let firstAborted = false
  const first = runDedupeRequest({
    mode: 'cancel-previous',
    key: 'users:search',
    executor: async (signal) => {
      signal?.addEventListener('abort', () => {
        firstAborted = true
      })
      await new Promise((resolve) => setTimeout(resolve, 30))
      return 'old-result'
    },
  })

  const second = runDedupeRequest({
    mode: 'cancel-previous',
    key: 'users:search',
    executor: async () => 'new-result',
  })

  assert.equal(await second, 'new-result')
  assert.equal(firstAborted, true)
  assert.equal(await first, 'old-result')
})

test('createDebouncedFn 只执行最后一次输入', async () => {
  const values: string[] = []
  const debounced = createDebouncedFn((value: string) => {
    values.push(value)
  }, 10)

  debounced('u')
  debounced('us')
  debounced('user')
  await new Promise((resolve) => setTimeout(resolve, 30))

  assert.deepEqual(values, ['user'])
})
