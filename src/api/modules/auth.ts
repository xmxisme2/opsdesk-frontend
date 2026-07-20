import { post } from '@/api/http'
import type { ApiId } from '@/types/api'
import type { AvatarOption, CaptchaResult, LoginRequest, LoginResult, RegisterRequest, SmsCodeSendResult } from '@/types/auth'
import type { UserGender, UserVO } from '@/types/user'

// 认证接口集中管理登录、注册、验证码和当前用户，页面禁止直接拼接 URL。
export function login(data: LoginRequest) {
  return post<LoginResult>('/auth/login', data)
}

export function register(data: RegisterRequest) {
  return post<UserVO>('/auth/register', data)
}

export function getCaptcha() {
  return post<CaptchaResult>('/auth/captcha', { scene: 'login', captchaType: 'IMAGE' })
}

export function sendSmsCode(data: { phone: string; scene: 'login' | 'register' }) {
  return post<SmsCodeSendResult>('/auth/sms-code/send', data, { dedupe: 'ignore-current', dedupeKey: `sms:${data.scene}:${data.phone}` })
}

export function getCurrentUser() {
  return post<UserVO>('/auth/me')
}

export function logout() {
  return post<Record<string, never>>('/auth/logout')
}

export function refreshToken(refreshToken: string) {
  return post<LoginResult>('/auth/refresh', { refreshToken })
}

export function updatePassword(data: { oldPassword: string; newPassword: string; confirmPassword: string }) {
  return post<Record<string, never>>('/auth/password', { ...data, kickoutOthers: true })
}

export function getAvatarOptions(gender?: UserGender) {
  return post<{ gender?: UserGender; options: AvatarOption[] }>('/users/avatar-options', { gender }, { silentError: true })
}

export function kickoutOtherSessions(currentRefreshToken: string) {
  return post<{ kickedCount: number }>('/auth/sessions/kickout-others', { currentRefreshToken })
}

export function updateMyProfile(data: Partial<UserVO> & { departmentId?: ApiId }) {
  return post<UserVO>('/users/me/profile', data)
}

export function uploadMyAvatar(file: File) { const data = new FormData(); data.append('file', file); return post<UserVO>('/users/me/avatar', data, { dedupe: 'ignore-current', dedupeKey: 'profile:avatar' }) }
