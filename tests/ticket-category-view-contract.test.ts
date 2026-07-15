import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const source = await readFile(
  new URL('../src/views/system/ticket-categories/TicketCategoryView.vue', import.meta.url),
  'utf8',
)

test('分类保存期间统一锁定树选择和增删入口', () => {
  assert.match(source, /const categoryInteractionLocked = computed\(\(\) => categorySaving\.value \|\| categoryDeleting\.value\)/)
  assert.match(source, /if \(categoryInteractionLocked\.value\) \{\s*return\s*\}/)
  assert.ok((source.match(/:disabled="categoryInteractionLocked/g) ?? []).length >= 3)
})

test('分类保存前快照提交模式避免响应期间表单状态改变提示语义', () => {
  assert.match(source, /const submittedMode = categoryForm\.id \? 'update' : 'create'/)
  assert.match(source, /submittedMode === 'update' \? '分类已保存' : '分类已创建'/)
})
