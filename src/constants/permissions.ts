import type { UserRoleCode } from '@/types/user'

export interface MenuConfig {
  title: string
  path: string
  icon: string
  roles?: UserRoleCode[]
  permission?: string
  feature?: 'ai'
  children?: MenuConfig[]
}

export const APP_MENUS: MenuConfig[] = [
  { title: '工作台', path: '/workbench', icon: 'Odometer' },
  { title: '工单列表', path: '/tickets', icon: 'Tickets' },
  { title: '我的工单', path: '/my-tickets', icon: 'Collection' },
  { title: '通知中心', path: '/notifications', icon: 'Bell' },
  { title: '知识库', path: '/knowledge', icon: 'Document' },
  { title: 'AI 助手', path: '/ai', icon: 'ChatDotRound', feature: 'ai' },
  { title: '数据看板', path: '/dashboard', icon: 'DataAnalysis', roles: ['MANAGER', 'ADMIN'] },
  { title: '团队成员管理', path: '/team-management', icon: 'UserFilled', roles: ['MANAGER'] },
  {
    title: '系统管理',
    path: '/system',
    icon: 'Setting',
    roles: ['ADMIN'],
    children: [
      { title: '用户管理', path: '/system/users', icon: 'User' },
      { title: '角色权限', path: '/system/roles', icon: 'Key' },
      { title: '部门与团队', path: '/system/organization', icon: 'OfficeBuilding' },
      { title: '工单分类与优先级', path: '/system/ticket-categories', icon: 'FolderOpened' },
      { title: '系统配置', path: '/system/config', icon: 'Tools' },
      { title: '通知模板', path: '/system/config/notification-templates', icon: 'Message' },
      { title: '操作日志', path: '/system/audit-logs', icon: 'List' },
      { title: 'AI 调用日志与开关', path: '/system/ai-settings', icon: 'Connection', feature: 'ai' },
    ],
  },
]
