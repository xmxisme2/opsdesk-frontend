import type { ApiId } from './api'
import type { UserGender, UserVO } from './user'

export interface LoginRequest {
  phone: string
  password?: string
  rememberMe: boolean
  captchaType: 'IMAGE' | 'SMS'
  captchaId?: string
  captchaCode?: string
}

export interface RegisterRequest {
  phone: string
  departmentId: ApiId
  password: string
  gender?: UserGender
  avatarCode?: string
  nickname?: string
  email?: string
  captchaId?: string
  captchaCode?: string
  smsCode?: string
}

/** 短信发送接口仅返回发送状态，验证码本身不会返回给浏览器。 */
export interface SmsCodeSendResult {
  enabled: boolean
  message: string
  cooldownSeconds: number
}

export interface LoginResult {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  refreshToken: string
  refreshExpiresIn: number
  user: UserVO
}

export interface CaptchaResult {
  captchaId: string
  imageBase64: string
  expiresIn: number
}

export interface AvatarOption {
  avatarCode: string
  avatarUrl: string
  label: string
}
