import assert from 'node:assert/strict'
import { test } from 'node:test'
import { excludeCategoryBranch, flattenCategoryIds } from '../src/utils/ticket-category-tree.ts'

const tree = [
  {
    id: '1',
    name: '系统故障',
    enabled: true,
    children: [
      {
        id: '2',
        parentId: '1',
        name: '网络访问',
        enabled: true,
        children: [{ id: '3', parentId: '2', name: '无线网络', enabled: true }],
      },
    ],
  },
  { id: '4', name: '账号问题', enabled: true },
]

test('父级选项排除当前分类和全部后代', () => {
  const result = excludeCategoryBranch(tree, '2')

  assert.deepEqual(flattenCategoryIds(result), ['1', '4'])
  assert.notEqual(result[0], tree[0])
})

test('未选择分类时保留完整树且不复用原节点', () => {
  const result = excludeCategoryBranch(tree)

  assert.deepEqual(flattenCategoryIds(result), ['1', '2', '3', '4'])
  assert.notEqual(result[0], tree[0])
})
