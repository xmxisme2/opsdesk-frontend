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

test('分类写操作期间禁用表单、保存并阻止错误态重试', () => {
  assert.match(source, /<el-form[^>]*:disabled="categoryInteractionLocked"/s)
  assert.match(source, /<el-button type="primary" :loading="categorySaving" :disabled="categoryInteractionLocked" @click="saveCategory">保存分类<\/el-button>/)
  assert.match(source, /function retryLoadCategories\(\) \{\s*if \(categoryInteractionLocked\.value\) \{\s*return\s*\}\s*void loadCategories\(\)\s*\}/)
  assert.match(source, /<ErrorState v-if="categoryError" :message="categoryError" @retry="retryLoadCategories" \/>/)
})

test('删除确认取消被本地捕获且不会进入 HTTP 删除', () => {
  assert.match(source, /try \{\s*await ElMessageBox\.confirm[\s\S]*?\} catch \{\s*return\s*\}\s*categoryDeleting\.value = true/)
})

test('分类保存前快照提交模式避免响应期间表单状态改变提示语义', () => {
  assert.match(source, /const submittedMode = categoryForm\.id \? 'update' : 'create'/)
  assert.match(source, /submittedMode === 'update' \? '分类已保存' : '分类已创建'/)
})
