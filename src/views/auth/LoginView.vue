<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RefreshRight } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { getCaptcha, sendSmsCode } from '@/api/modules/auth'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/modules/auth'
import type { LoginRequest } from '@/types/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const captchaImage = ref('')
const captchaLoading = ref(false)
const serverError = ref('')
const loginMode = ref<'PASSWORD' | 'SMS'>('PASSWORD')
const smsSending = ref(false)

const form = reactive<LoginRequest>({
  phone: '',
  password: '',
  rememberMe: true,
  captchaType: 'IMAGE',
  captchaId: '', captchaCode: '',
})

const phonePattern = /^1\d{10}$/

const rules: FormRules<LoginRequest> = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: phonePattern, message: '请输入 11 位中国大陆手机号', trigger: 'blur' },
  ],
}

// 登录页首次进入即加载图形验证码，登录失败后刷新验证码避免继续提交过期或已消费的验证码。
async function refreshCaptcha() {
  captchaLoading.value = true
  try {
    const captcha = await getCaptcha()
    form.captchaId = captcha.captchaId
    captchaImage.value = captcha.imageBase64
  } finally {
    captchaLoading.value = false
  }
}

async function submitLogin() {
  serverError.value = ''
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  if (loginMode.value === 'PASSWORD' && (!form.password || !form.captchaCode)) {
    serverError.value = '请输入密码和图形验证码'
    return
  }
  if (loginMode.value === 'SMS' && !form.captchaCode) {
    serverError.value = '请输入短信验证码'
    return
  }

  try {
    await authStore.login({ ...form, captchaType: loginMode.value === 'SMS' ? 'SMS' : 'IMAGE' })
    await router.push(String(route.query.redirect || '/workbench'))
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
    form.captchaCode = ''
    if (loginMode.value === 'PASSWORD') await refreshCaptcha()
  }
}

async function sendLoginSms() {
  if (!phonePattern.test(form.phone)) { ElMessage.warning('请先输入正确的手机号'); return }
  smsSending.value = true
  try { const result = await sendSmsCode({ phone: form.phone, scene: 'login' }); ElMessage.success(result.message) } finally { smsSending.value = false }
}

async function switchMode() {
  loginMode.value = loginMode.value === 'PASSWORD' ? 'SMS' : 'PASSWORD'
  form.captchaCode = ''
  if (loginMode.value === 'PASSWORD' && !captchaImage.value) await refreshCaptcha()
}

onMounted(refreshCaptcha)
</script>

<template>
  <AuthLayout mode="brand">
    <!-- 登录页遵循后端认证契约：手机号、密码、图形验证码和 rememberMe 统一提交到 /api/auth/login。 -->
    <el-card class="login-card" shadow="never">
      <header class="login-card__header">
        <h2>登录工作台</h2>
        <p>请输入手机号、密码和图形验证码继续</p>
      </header>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submitLogin">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" autocomplete="username" maxlength="11" placeholder="请输入手机号" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input v-if="loginMode === 'PASSWORD'"
            v-model="form.password"
            autocomplete="current-password"
            placeholder="请输入密码"
            show-password
            type="password"
          />
        </el-form-item>

        <el-form-item v-if="loginMode === 'PASSWORD'" label="图形验证码" prop="captchaCode">
          <div class="captcha-row">
            <el-input v-model="form.captchaCode" maxlength="6" placeholder="请输入验证码" />
            <button class="captcha-row__image" type="button" :disabled="captchaLoading" @click="refreshCaptcha">
              <img v-if="captchaImage" :src="captchaImage" alt="图形验证码" />
              <el-icon v-else class="captcha-row__icon" :class="{ 'is-loading': captchaLoading }">
                <RefreshRight />
              </el-icon>
            </button>
          </div>
        </el-form-item>

        <el-form-item v-else label="短信验证码" prop="captchaCode"><div class="captcha-row"><el-input v-model="form.captchaCode" maxlength="8" placeholder="请输入短信验证码" /><el-button :loading="smsSending" @click="sendLoginSms">发送验证码</el-button></div></el-form-item>

        <div class="login-card__options">
          <el-checkbox v-model="form.rememberMe">记住登录状态</el-checkbox>
          <el-button link type="primary" @click="switchMode">{{ loginMode === 'PASSWORD' ? '短信验证码登录' : '密码登录' }}</el-button>
        </div>

        <p v-if="serverError" class="login-card__error">{{ serverError }}</p>

        <el-button class="login-card__submit" type="primary" native-type="submit" :loading="authStore.loading">
          登录
        </el-button>
      </el-form>

      <p class="login-card__footer">没有账号？<router-link to="/register">立即注册</router-link></p>
    </el-card>
  </AuthLayout>
</template>

<style scoped>
.login-card {
  width: min(430px, 100%);
  min-height: 560px;
  padding: 18px 24px 8px;
  border: 1px solid #e3e8ef;
  border-radius: 12px;
}

.login-card__header {
  margin-bottom: 26px;
}

.login-card__header h2 {
  margin: 0;
  color: #0f131a;
  font-size: 26px;
  font-weight: 700;
}

.login-card__header p {
  margin: 10px 0 0;
  color: #616e80;
  line-height: 1.6;
}

.captcha-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 126px;
  gap: 10px;
  width: 100%;
}

.captcha-row__image {
  display: grid;
  place-items: center;
  height: 40px;
  padding: 0;
  overflow: hidden;
  border: 1px solid #d1d9e3;
  border-radius: 6px;
  background: #f7f9fc;
  cursor: pointer;
}

.captcha-row__image:disabled {
  cursor: wait;
  opacity: 0.72;
}

.captcha-row__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.captcha-row__icon {
  color: #1252ad;
  font-size: 18px;
}

.captcha-row__icon.is-loading {
  animation: captcha-spin 0.8s linear infinite;
}

.login-card__options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 2px 0 20px;
}

.login-card__error {
  min-height: 20px;
  margin: -4px 0 12px;
  color: #c71f24;
  font-size: 13px;
  line-height: 20px;
}

.login-card__submit {
  width: 100%;
  height: 42px;
  font-weight: 600;
}

.login-card__footer {
  margin: 20px 0 0;
  color: #616e80;
  text-align: center;
}

@keyframes captcha-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 520px) {
  .login-card {
    min-height: auto;
    padding: 10px 8px 0;
  }

  .captcha-row {
    grid-template-columns: minmax(0, 1fr) 112px;
  }
}
</style>
