import type { ApiId } from '@/types/api'
import type { DepartmentVO } from '@/types/organization'

export interface DepartmentOption {
  label: string
  value: ApiId
}

export interface DepartmentTreeOption extends DepartmentOption {
  children?: DepartmentTreeOption[]
}

// 将后端部门树转换为下拉框选项，使用缩进保留层级感，注册页和用户管理页共用。
export function flattenDepartmentOptions(departments: DepartmentVO[], depth = 0): DepartmentOption[] {
  return departments.flatMap((department) => {
    const option = {
      label: `${'  '.repeat(depth)}${department.name}`,
      value: department.id,
    }
    return [option, ...flattenDepartmentOptions(department.children ?? [], depth + 1)]
  })
}

// 将后端部门树转换为 Element Plus TreeSelect 节点，用户切换主属部门时保留真实组织层级。
export function buildDepartmentTreeOptions(departments: DepartmentVO[]): DepartmentTreeOption[] {
  return departments.map((department) => {
    const children = buildDepartmentTreeOptions(department.children ?? [])
    return {
      label: department.name,
      value: department.id,
      ...(children.length ? { children } : {}),
    }
  })
}
