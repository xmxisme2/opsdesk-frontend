import type { ApiId } from './api'

export interface DepartmentVO {
  id: ApiId
  parentId?: ApiId
  name: string
  leaderId?: ApiId
  leaderName?: string
  memberCount: number
  children?: DepartmentVO[]
  createdAt?: string
  updatedAt?: string
}

export interface TeamVO {
  id: ApiId
  name: string
  description?: string
  departmentIds: ApiId[]
  leaderIds: ApiId[]
  memberCount: number
  processingScope?: string
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}
