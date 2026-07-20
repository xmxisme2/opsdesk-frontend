<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { getAvatarOptions, register, sendSmsCode } from '@/api/modules/auth'
import { getDepartmentTree } from '@/api/modules/departments'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { buildDepartmentTreeOptions, type DepartmentTreeOption } from '@/utils/department-options'
import type { AvatarOption, RegisterRequest } from '@/types/auth'

const router = useRouter()
const formRef = ref<FormInstance>()
const avatarOptions = ref<AvatarOption[]>([])
const departmentOptions = ref<DepartmentTreeOption[]>([])
const avatarLoading = ref(false)
const departmentLoading = ref(false)
const registerLoading = ref(false)
const serverError = ref('')
const smsSending = ref(false)

const form = reactive<RegisterRequest>({
  phone: '',
  departmentId: '',
  password: '',
  gender: 'MALE',
  avatarCode: 'avatar_male_01',
  nickname: '',
  email: '',
  smsCode: '',
})

const phonePattern = /^1\d{10}$/
const genderOptions = [
  { label: '男', value: 'MALE' },
  { label: '女', value: 'FEMALE' },
]
const fallbackAvatarOptions: AvatarOption[] = [
  { avatarCode: 'avatar_male_01', avatarUrl: '', label: '男 01' },
  { avatarCode: 'avatar_male_02', avatarUrl: '', label: '男 02' },
  { avatarCode: 'avatar_male_03', avatarUrl: '', label: '男 03' },
  { avatarCode: 'avatar_female_01', avatarUrl: '', label: '女 01' },
  { avatarCode: 'avatar_female_02', avatarUrl: '', label: '女 02' },
  { avatarCode: 'avatar_female_03', avatarUrl: '', label: '女 03' },
]

const rules: FormRules<RegisterRequest> = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: phonePattern, message: '请输入 11 位中国大陆手机号', trigger: 'blur' },
  ],
  departmentId: [{ required: true, message: '请选择主属部门', trigger: 'change' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, max: 64, message: '密码长度需为 8-64 位', trigger: 'blur' },
  ],
  email: [{ type: 'email', message: '请输入有效邮箱', trigger: 'blur' }],
  smsCode: [{ required: true, message: '请输入短信验证码', trigger: 'blur' }],
}

// 注册页部门选项来自后端部门树，避免初始化数据变化后前端仍停留在旧常量。
async function loadDepartmentOptions() {
  departmentLoading.value = true
  try {
    const departments = await getDepartmentTree({ enabled: true })
    departmentOptions.value = buildDepartmentTreeOptions(departments)
  } catch (error) {
    departmentOptions.value = []
    serverError.value = error instanceof Error ? error.message : '部门加载失败，请刷新后重试'
  } finally {
    departmentLoading.value = false
  }
}

async function loadAvatarOptions() {
  avatarLoading.value = true
  try {
    const result = await getAvatarOptions(form.gender)
    avatarOptions.value = result.options
  } catch {
    const genderPrefix = form.gender === 'FEMALE' ? 'avatar_female_' : 'avatar_male_'
    avatarOptions.value = fallbackAvatarOptions.filter((option) => option.avatarCode.startsWith(genderPrefix))
  } finally {
    if (!avatarOptions.value.some((option) => option.avatarCode === form.avatarCode)) {
      form.avatarCode = avatarOptions.value[0]?.avatarCode
    }
    avatarLoading.value = false
  }
}

function normalizeRegisterPayload(): RegisterRequest {
  return {
    ...form,
    avatarCode: form.avatarCode || undefined,
    nickname: form.nickname?.trim() || undefined,
    email: form.email?.trim() || undefined,
  }
}

async function submitRegister() {
  serverError.value = ''
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  registerLoading.value = true
  try {
    await register(normalizeRegisterPayload())
    ElMessage.success('注册成功，请登录')
    await router.push('/login')
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : '注册失败，请稍后重试'
  } finally {
    registerLoading.value = false
  }
}

async function sendRegisterSms() {
  if (!phonePattern.test(form.phone)) { ElMessage.warning('请先输入正确的手机号'); return }
  smsSending.value = true
  try { const result = await sendSmsCode({ phone: form.phone, scene: 'register' }); ElMessage.success(result.message) } finally { smsSending.value = false }
}

watch(
  () => form.gender,
  async (gender) => {
    form.avatarCode = gender === 'FEMALE' ? 'avatar_female_01' : 'avatar_male_01'
    await loadAvatarOptions()
  },
)

onMounted(() => {
  loadDepartmentOptions()
  loadAvatarOptions()
})
</script>

<template>
  <AuthLayout mode="center">
    <!-- 注册页仅提交首版账号必填字段，角色和权限由管理员后续在系统管理中维护。 -->
    <el-card class="register-card" shadow="never">
      <header class="register-card__header">
        <h2>创建企业账号</h2>
        <p>完成手机号、主属部门和密码配置后即可进入登录流程</p>
      </header>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submitRegister">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" autocomplete="username" maxlength="11" placeholder="请输入手机号" />
        </el-form-item>

        <el-form-item label="短信验证码" prop="smsCode"><div class="sms-code-row"><el-input v-model="form.smsCode" maxlength="8" placeholder="请输入短信验证码" /><el-button :loading="smsSending" @click="sendRegisterSms">发送验证码</el-button></div></el-form-item>

        <el-form-item label="主属部门" prop="departmentId">
          <el-tree-select
            v-model="form.departmentId"
            class="register-card__full"
            :data="departmentOptions"
            :loading="departmentLoading"
            check-strictly
            filterable
            node-key="value"
            placeholder="请选择主属部门"
            empty-text="暂无部门"
            :render-after-expand="false"
          />
        </el-form-item>

        <el-form-item label="性别" prop="gender">
          <el-segmented v-model="form.gender" :options="genderOptions" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            autocomplete="new-password"
            placeholder="请输入 8-64 位密码"
            show-password
            type="password"
          />
        </el-form-item>

        <div class="register-card__optional">
          <el-form-item label="昵称">
            <el-input v-model="form.nickname" placeholder="可选" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="可选" />
          </el-form-item>
        </div>

        <el-form-item label="默认头像">
          <div v-loading="avatarLoading" class="avatar-options">
            <button
              v-for="option in avatarOptions"
              :key="option.avatarCode"
              class="avatar-options__item"
              :class="{ 'is-active': option.avatarCode === form.avatarCode }"
              type="button"
              @click="form.avatarCode = option.avatarCode"
            >
              <span class="avatar-options__mark">{{ option.label.slice(0, 1) }}</span>
              <span>{{ option.label }}</span>
            </button>
          </div>
        </el-form-item>

        <p class="register-card__hint">管理员后续可调整角色、权限和部门归属。</p>
        <p v-if="serverError" class="register-card__error">{{ serverError }}</p>

        <el-button class="register-card__submit" type="primary" native-type="submit" :loading="registerLoading">
          注册
        </el-button>
      </el-form>

      <p class="register-card__footer">已有账号？<router-link to="/login">返回登录</router-link></p>
    </el-card>
  </AuthLayout>
</template>

<style scoped>
.register-card {
  width: min(440px, 100%);
  min-height: 690px;
  padding: 16px 24px 8px;
  border: 1px solid #e3e8ef;
  border-radius: 12px;
}

.register-card__header {
  margin-bottom: 18px;
}

.register-card__header h2 {
  margin: 0;
  color: #0f131a;
  font-size: 26px;
  font-weight: 700;
}

.register-card__header p {
  margin: 10px 0 0;
  color: #616e80;
  line-height: 1.6;
}

.register-card__full {
  width: 100%;
}

.sms-code-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; width: 100%; }

.register-card__optional {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.avatar-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  min-height: 54px;
}

.avatar-options__item {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  height: 42px;
  padding: 0 8px;
  border: 1px solid #d1d9e3;
  border-radius: 6px;
  background: #ffffff;
  color: #2f3a4a;
  cursor: pointer;
}

.avatar-options__item.is-active {
  border-color: #1252ad;
  background: #edf5ff;
  color: #1252ad;
}

.avatar-options__mark {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #dbe9ff;
  font-size: 12px;
  font-weight: 700;
}

.avatar-options__item span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.register-card__hint {
  margin: -2px 0 10px;
  color: #616e80;
  font-size: 13px;
}

.register-card__error {
  min-height: 20px;
  margin: 0 0 10px;
  color: #c71f24;
  font-size: 13px;
  line-height: 20px;
}

.register-card__submit {
  width: 100%;
  height: 42px;
  font-weight: 600;
}

.register-card__footer {
  margin: 18px 0 0;
  color: #616e80;
  text-align: center;
}

@media (max-width: 520px) {
  .register-card {
    min-height: auto;
    padding: 10px 8px 0;
  }

  .register-card__optional {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .avatar-options {
    grid-template-columns: 1fr;
  }
}
</style>
