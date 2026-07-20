<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import PageHeader from '@/components/common/PageHeader.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { getAvatarOptions, updateMyProfile, updatePassword } from '@/api/modules/auth'
import { useAuthStore } from '@/stores/modules/auth'
import type { AvatarOption } from '@/types/auth'
import type { UserGender } from '@/types/user'

const authStore = useAuthStore(); const profileFormRef = ref<FormInstance>(); const passwordFormRef = ref<FormInstance>()
const loading = ref(false); const savingProfile = ref(false); const savingPassword = ref(false); const errorMessage = ref(''); const avatars = ref<AvatarOption[]>([])
const user = computed(() => authStore.currentUser)
const profileForm = reactive({ nickname: '', email: '', gender: 'MALE' as UserGender, avatarCode: '' })
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const profileRules: FormRules = { nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }], email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }] }
const passwordRules: FormRules = { oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }], newPassword: [{ required: true, min: 8, max: 64, message: '新密码长度为 8 至 64 位', trigger: 'blur' }], confirmPassword: [{ required: true, validator: (_r, value, cb) => value === passwordForm.newPassword ? cb() : cb(new Error('两次输入的新密码不一致')), trigger: 'blur' }] }
function fill() { const value = user.value; if (!value) return; profileForm.nickname = value.nickname || ''; profileForm.email = value.email || ''; profileForm.gender = value.gender === 'FEMALE' ? 'FEMALE' : 'MALE'; profileForm.avatarCode = value.avatarCode || '' }
async function load() { loading.value = true; errorMessage.value = ''; try { await authStore.fetchCurrentUser(); fill(); await loadAvatars() } catch (error) { errorMessage.value = error instanceof Error ? error.message : '个人资料加载失败' } finally { loading.value = false } }
async function loadAvatars() { const result = await getAvatarOptions(profileForm.gender); avatars.value = result.options; if (!avatars.value.some(item => item.avatarCode === profileForm.avatarCode)) profileForm.avatarCode = avatars.value[0]?.avatarCode || '' }
async function saveProfile() { if (!(await profileFormRef.value?.validate().catch(() => false))) return; savingProfile.value = true; try { const result = await updateMyProfile(profileForm); authStore.currentUser = result; fill(); ElMessage.success('个人资料已保存') } finally { savingProfile.value = false } }
async function savePassword() { if (!(await passwordFormRef.value?.validate().catch(() => false))) return; savingPassword.value = true; try { await updatePassword(passwordForm); Object.assign(passwordForm, { oldPassword: '', newPassword: '', confirmPassword: '' }); ElMessage.success('密码已修改，其他登录设备已退出') } finally { savingPassword.value = false } }
async function logout() { await ElMessageBox.confirm('确认退出当前登录？', '退出登录', { type: 'warning' }); await authStore.logout(); location.assign('/login') }
onMounted(load)
</script>

<template>
  <section class="page-stack profile-page">
    <PageHeader title="个人中心" description="查看个人资料、维护展示信息并修改登录密码" />
    <ErrorState v-if="errorMessage" :message="errorMessage" @retry="load" />
    <section v-else v-loading="loading" class="profile-grid">
      <article class="page-panel profile-card"><header><el-avatar :size="72" :src="user?.avatarUrl">{{ user?.nickname?.slice(0, 1) }}</el-avatar><div><h2>{{ user?.nickname || user?.username }}</h2><p>{{ user?.roles.map(item => item.code).join(' / ') || 'USER' }} / {{ user?.departmentName || '未分配部门' }}</p></div></header><el-form ref="profileFormRef" :model="profileForm" :rules="profileRules" label-position="top"><el-form-item label="昵称" prop="nickname"><el-input v-model="profileForm.nickname" maxlength="64" /></el-form-item><el-form-item label="邮箱" prop="email"><el-input v-model="profileForm.email" maxlength="128" /></el-form-item><el-form-item label="手机号"><el-input :model-value="user?.phone" disabled /></el-form-item><el-form-item label="性别"><el-radio-group v-model="profileForm.gender" @change="loadAvatars"><el-radio value="MALE">男</el-radio><el-radio value="FEMALE">女</el-radio></el-radio-group></el-form-item><el-form-item label="默认头像"><el-radio-group v-model="profileForm.avatarCode" class="avatar-options"><el-radio v-for="item in avatars" :key="item.avatarCode" :value="item.avatarCode"><el-avatar :src="item.avatarUrl" /></el-radio></el-radio-group></el-form-item><div class="profile-actions"><el-button type="primary" :loading="savingProfile" @click="saveProfile">保存资料</el-button><el-button type="danger" plain @click="logout">退出登录</el-button></div></el-form></article>
      <article class="page-panel password-card"><h2>修改密码</h2><p>密码修改后，其他设备上的登录会话将失效。</p><el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-position="top"><el-form-item label="旧密码" prop="oldPassword"><el-input v-model="passwordForm.oldPassword" type="password" show-password autocomplete="current-password" /></el-form-item><el-form-item label="新密码" prop="newPassword"><el-input v-model="passwordForm.newPassword" type="password" show-password autocomplete="new-password" /></el-form-item><el-form-item label="确认新密码" prop="confirmPassword"><el-input v-model="passwordForm.confirmPassword" type="password" show-password autocomplete="new-password" /></el-form-item><el-button type="primary" :loading="savingPassword" @click="savePassword">确认修改</el-button></el-form></article>
    </section>
  </section>
</template>
<style scoped>.profile-grid{display:grid;grid-template-columns:minmax(360px,420px) minmax(420px,1fr);gap:20px}.profile-card,.password-card{padding:28px}.profile-card header{display:flex;gap:18px;align-items:center;margin-bottom:24px}.profile-card h2,.password-card h2{margin:0;font-size:22px}.profile-card p,.password-card>p{margin:6px 0 24px;color:var(--ops-text-secondary);font-size:13px}.profile-actions{display:flex;gap:12px}.avatar-options{display:flex;gap:12px}.avatar-options :deep(.el-radio){margin:0}.avatar-options :deep(.el-radio__label){padding-left:6px}@media(max-width:900px){.profile-grid{grid-template-columns:1fr}}</style>
