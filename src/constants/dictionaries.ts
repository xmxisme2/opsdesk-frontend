import type { OptionItem } from '@/types/api'

export const USER_STATUS_OPTIONS: OptionItem[] = [
  { label: '启用', value: 'ACTIVE' },
  { label: '停用', value: 'DISABLED' },
  { label: '锁定', value: 'LOCKED' },
]

export const USER_ROLE_OPTIONS: OptionItem[] = [
  { label: '普通用户', value: 'USER' },
  { label: '处理人', value: 'AGENT' },
  { label: '团队负责人', value: 'MANAGER' },
  { label: '管理员', value: 'ADMIN' },
]

// 注册页在部门接口上线前使用 seed.sql 初始化部门，确保前端注册请求与后端可用数据一致。
export const SEED_DEPARTMENT_OPTIONS: OptionItem[] = [
  { label: 'OpsDesk 公司', value: '1' },
  { label: 'IT 部', value: '2' },
  { label: '运维部', value: '3' },
  { label: '研发部', value: '4' },
  { label: '财务部', value: '5' },
  { label: '人力行政', value: '6' },
]
