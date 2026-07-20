import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildDepartmentTreeOptions, flattenDepartmentOptions } from '../src/utils/department-options.ts'

test('buildDepartmentTreeOptions 保留部门树层级', () => {
  const departments = [
    {
      id: '1',
      parentId: undefined,
      name: 'OpsDesk 公司',
      children: [
        {
          id: '2',
          parentId: '1',
          name: 'IT 部',
          children: [
            { id: '3', parentId: '2', name: '前端', children: [] },
            { id: '4', parentId: '2', name: '后端', children: [] },
          ],
        },
      ],
    },
  ]

  assert.deepEqual(buildDepartmentTreeOptions(departments), [
    {
      label: 'OpsDesk 公司',
      value: '1',
      children: [
        {
          label: 'IT 部',
          value: '2',
          children: [
            { label: '前端', value: '3' },
            { label: '后端', value: '4' },
          ],
        },
      ],
    },
  ])
})

test('flattenDepartmentOptions 仍可提供表格兜底显示', () => {
  const departments = [
    {
      id: '1',
      parentId: undefined,
      name: 'IT 部',
      children: [{ id: '2', parentId: '1', name: '前端', children: [] }],
    },
  ]

  assert.deepEqual(flattenDepartmentOptions(departments), [
    { label: 'IT 部', value: '1' },
    { label: '  前端', value: '2' },
  ])
})
