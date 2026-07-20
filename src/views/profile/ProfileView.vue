<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type UploadRequestOptions } from 'element-plus'
import PageHeader from '@/components/common/PageHeader.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { getAvatarOptions, updateMyProfile, updatePassword, uploadMyAvatar } from '@/api/modules/auth'
import { useAuthStore } from '@/stores/modules/auth'
import type { AvatarOption } from '@/types/auth'
import type { UserGender } from '@/types/user'

/** 个人资料页：资料编辑、密码维护与自定义头像裁剪上传统一在此闭环。 */
const authStore = useAuthStore()
const profileFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()
const loading = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)
const uploadingAvatar = ref(false)
const errorMessage = ref('')
const avatars = ref<AvatarOption[]>([])
const cropVisible = ref(false)
const cropImageUrl = ref('')
const cropZoom = ref(1)

const user = computed(() => authStore.currentUser)
const profileForm = reactive({ nickname: '', email: '', gender: 'MALE' as UserGender, avatarCode: '' })
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const profileRules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}
const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [{ required: true, min: 8, max: 64, message: '新密码长度为 8 至 64 位', trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: (_rule, value, callback) => value === passwordForm.newPassword ? callback() : callback(new Error('两次输入的新密码不一致')), trigger: 'blur' }],
}

function fill() {
  const value = user.value
  if (!value) return
  profileForm.nickname = value.nickname || ''
  profileForm.email = value.email || ''
  profileForm.gender = value.gender === 'FEMALE' ? 'FEMALE' : 'MALE'
  profileForm.avatarCode = value.avatarCode || ''
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    await authStore.fetchCurrentUser()
    fill()
    await loadAvatars()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '个人资料加载失败'
  } finally {
    loading.value = false
  }
}

async function loadAvatars() {
  const result = await getAvatarOptions(profileForm.gender)
  avatars.value = result.options
  // 自定义头像不是默认头像选项，切换性别时保留其选择状态。
  if (profileForm.avatarCode !== 'custom' && !avatars.value.some((item) => item.avatarCode === profileForm.avatarCode)) {
    profileForm.avatarCode = avatars.value[0]?.avatarCode || ''
  }
}

async function saveProfile() {
  if (!(await profileFormRef.value?.validate().catch(() => false))) return
  savingProfile.value = true
  try {
    const result = await updateMyProfile(profileForm)
    authStore.currentUser = result
    fill()
    ElMessage.success('个人资料已保存')
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  if (!(await passwordFormRef.value?.validate().catch(() => false))) return
  savingPassword.value = true
  try {
    await updatePassword(passwordForm)
    Object.assign(passwordForm, { oldPassword: '', newPassword: '', confirmPassword: '' })
    ElMessage.success('密码已修改，其他登录设备已退出')
  } finally {
    savingPassword.value = false
  }
}

/** 上传组件仅作为文件选择入口，上传在裁剪完成后由统一 API 执行。 */
function selectAvatar(options: UploadRequestOptions) {
  const file = options.file
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('原图不能超过 5MB')
    return
  }
  revokeCropImage()
  cropImageUrl.value = URL.createObjectURL(file)
  cropZoom.value = 1
  cropVisible.value = true
}

function revokeCropImage() {
  if (cropImageUrl.value) URL.revokeObjectURL(cropImageUrl.value)
  cropImageUrl.value = ''
}

function closeCropper() {
  cropVisible.value = false
  revokeCropImage()
}

/** 将圆形预览框中心区域导出为 PNG，确保后端可按固定格式安全保存。 */
async function confirmCrop() {
  const source = new Image()
  source.src = cropImageUrl.value
  await source.decode()
  const size = 320
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) {
    ElMessage.error('浏览器不支持图片裁剪')
    return
  }
  const scale = Math.max(size / source.naturalWidth, size / source.naturalHeight) * cropZoom.value
  const width = source.naturalWidth * scale
  const height = source.naturalHeight * scale
  context.drawImage(source, (size - width) / 2, (size - height) / 2, width, height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) {
    ElMessage.error('头像裁剪失败，请重试')
    return
  }
  uploadingAvatar.value = true
  try {
    const result = await uploadMyAvatar(new File([blob], 'avatar.png', { type: 'image/png' }))
    authStore.currentUser = result
    fill()
    closeCropper()
    ElMessage.success('头像已更新')
  } finally {
    uploadingAvatar.value = false
  }
}

async function logout() {
  await ElMessageBox.confirm('确认退出当前登录？', '退出登录', { type: 'warning' })
  await authStore.logout()
  location.assign('/login')
}

onMounted(load)
onBeforeUnmount(revokeCropImage)
</script>

<template>
  <section class="page-stack profile-page">
    <PageHeader title="个人中心" description="查看个人资料、维护展示信息并修改登录密码" />
    <ErrorState v-if="errorMessage" :message="errorMessage" @retry="load" />
    <section v-else v-loading="loading" class="profile-grid">
      <article class="page-panel profile-card">
        <header>
          <el-avatar :size="72" :src="user?.avatarUrl">{{ user?.nickname?.slice(0, 1) }}</el-avatar>
          <div>
            <h2>{{ user?.nickname || user?.username }}</h2>
            <p>{{ user?.roles.map((item) => item.code).join(' / ') || 'USER' }} / {{ user?.departmentName || '未分配部门' }}</p>
          </div>
        </header>
        <el-form ref="profileFormRef" :model="profileForm" :rules="profileRules" label-position="top">
          <el-form-item label="昵称" prop="nickname"><el-input v-model="profileForm.nickname" maxlength="64" /></el-form-item>
          <el-form-item label="邮箱" prop="email"><el-input v-model="profileForm.email" maxlength="128" /></el-form-item>
          <el-form-item label="手机号"><el-input :model-value="user?.phone" disabled /></el-form-item>
          <el-form-item label="性别">
            <el-radio-group v-model="profileForm.gender" @change="loadAvatars"><el-radio value="MALE">男</el-radio><el-radio value="FEMALE">女</el-radio></el-radio-group>
          </el-form-item>
          <el-form-item label="头像">
            <div class="avatar-editor">
              <el-radio-group v-model="profileForm.avatarCode" class="avatar-options">
                <el-radio v-for="item in avatars" :key="item.avatarCode" :value="item.avatarCode"><el-avatar :src="item.avatarUrl" /></el-radio>
              </el-radio-group>
              <el-upload :show-file-list="false" :http-request="selectAvatar" accept="image/*">
                <el-button plain>上传并裁剪</el-button>
              </el-upload>
            </div>
            <span v-if="profileForm.avatarCode === 'custom'" class="field-tip">当前使用自定义头像</span>
          </el-form-item>
          <div class="profile-actions"><el-button type="primary" :loading="savingProfile" @click="saveProfile">保存资料</el-button><el-button type="danger" plain @click="logout">退出登录</el-button></div>
        </el-form>
      </article>
      <article class="page-panel password-card">
        <h2>修改密码</h2>
        <p>密码修改后，其他设备上的登录会话将失效。</p>
        <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-position="top">
          <el-form-item label="旧密码" prop="oldPassword"><el-input v-model="passwordForm.oldPassword" type="password" show-password autocomplete="current-password" /></el-form-item>
          <el-form-item label="新密码" prop="newPassword"><el-input v-model="passwordForm.newPassword" type="password" show-password autocomplete="new-password" /></el-form-item>
          <el-form-item label="确认新密码" prop="confirmPassword"><el-input v-model="passwordForm.confirmPassword" type="password" show-password autocomplete="new-password" /></el-form-item>
          <el-button type="primary" :loading="savingPassword" @click="savePassword">确认修改</el-button>
        </el-form>
      </article>
    </section>

    <el-dialog v-model="cropVisible" title="裁剪头像" width="440px" :close-on-click-modal="false" @closed="closeCropper">
      <div class="crop-dialog">
        <div class="crop-frame"><img :src="cropImageUrl" :style="{ transform: `scale(${cropZoom})` }" alt="待裁剪头像" /></div>
        <p>拖动下方滑块调整裁剪范围，圆形区域将作为头像展示。</p>
        <el-slider v-model="cropZoom" :min="1" :max="3" :step="0.05" />
      </div>
      <template #footer><el-button @click="closeCropper">取消</el-button><el-button type="primary" :loading="uploadingAvatar" @click="confirmCrop">确认上传</el-button></template>
    </el-dialog>
  </section>
</template>

<style scoped>
.profile-grid { display: grid; grid-template-columns: minmax(360px, 420px) minmax(420px, 1fr); gap: 20px; }
.profile-card, .password-card { padding: 28px; }
.profile-card header { display: flex; gap: 18px; align-items: center; margin-bottom: 24px; }
.profile-card h2, .password-card h2 { margin: 0; font-size: 22px; }
.profile-card p, .password-card > p, .crop-dialog p { margin: 6px 0 24px; color: var(--ops-text-secondary); font-size: 13px; }
.profile-actions, .avatar-editor { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.avatar-options { display: flex; gap: 12px; }
.avatar-options :deep(.el-radio) { margin: 0; }
.avatar-options :deep(.el-radio__label) { padding-left: 6px; }
.field-tip { display: block; margin-top: 8px; color: var(--ops-text-secondary); font-size: 12px; }
.crop-dialog { display: flex; flex-direction: column; align-items: center; }
.crop-frame { width: 256px; height: 256px; overflow: hidden; border: 2px solid var(--el-color-primary); border-radius: 50%; background: var(--el-fill-color-light); }
.crop-frame img { width: 100%; height: 100%; object-fit: cover; transform-origin: center; }
.crop-dialog p { margin: 16px 0 8px; text-align: center; }
.crop-dialog :deep(.el-slider) { width: 256px; }
@media (max-width: 900px) { .profile-grid { grid-template-columns: 1fr; } }
</style>
