export type ApiId = string

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PageRequest {
  page?: number
  size?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PageResult<T> {
  records: T[]
  page: number
  size: number
  total: number
}

export interface OptionItem {
  label: string
  value: string
}
