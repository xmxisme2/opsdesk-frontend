import type { ApiResponse } from '@/types/api'

const ERROR_MESSAGE_MAP: Record<number, string> = {
  400001: '请求参数错误',
  401001: '登录状态已失效',
  403001: '当前账号无权限访问',
  404001: '资源不存在',
  409001: '当前状态不允许执行该操作',
  500001: '系统异常，请稍后重试',
  500101: '文件上传失败',
  500201: 'AI 服务暂不可用',
}

// 统一错误文案在这里收敛，避免页面散落错误码判断。
export function normalizeErrorMessage(payload?: Partial<ApiResponse>) {
  if (!payload) {
    return '网络异常，请检查服务是否启动'
  }
  return payload.message || ERROR_MESSAGE_MAP[payload.code ?? 0] || '请求失败，请稍后重试'
}
