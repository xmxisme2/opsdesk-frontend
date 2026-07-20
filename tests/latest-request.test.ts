import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLatestRequestGuard } from '../src/utils/latest-request.ts'

test('旧请求晚结束时不能覆盖新请求状态', () => {
  const guard = createLatestRequestGuard()
  const state = { value: '', loading: false }
  const oldRequest = guard.begin()
  state.loading = true
  const newRequest = guard.begin()

  if (guard.isLatest(newRequest)) {
    state.value = 'new'
    state.loading = false
  }
  if (guard.isLatest(oldRequest)) {
    state.value = 'old'
    state.loading = false
  }

  assert.deepEqual(state, { value: 'new', loading: false })
})
