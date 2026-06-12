<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  CirclePlus,
  Delete,
  Edit,
  Key,
  Refresh,
  RefreshRight,
  Search,
  SwitchButton,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { isRequestCanceled } from '@/api/http'
import { getAvatarOptions } from '@/api/modules/auth'
import { getDepartmentTree } from '@/api/modules/departments'
import { searchRoles } from '@/api/modules/roles'
import {
  createUser,
  deleteUser,
  getUserDetail,
  resetUserPassword,
  searchUsers,
  updateUser,
  updateUserRoles,
  updateUserStatus,
} from '@/api/modules/users'
import PageHeader from '@/components/common/PageHeader.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import { USER_STATUS_OPTIONS } from '@/constants/dictionaries'
import { useAuthStore } from '@/stores/modules/auth'
import { createDebouncedFn } from '@/utils/debounce'
import {
  buildDepartmentTreeOptions,
  flattenDepartmentOptions,
  type DepartmentOption,
  type DepartmentTreeOption,
} from '@/utils/department-options'
import { formatDateTime } from '@/utils/format-date'
import type { AvatarOption } from '@/types/auth'
import type { ApiId } from '@/types/api'
import type { RoleVO } from '@/types/role'
import type {
  UserCreateRequest,
  UserGender,
  UserSearchRequest,
  UserStatus,
  UserUpdateRequest,
  UserVO,
} from '@/types/user'

type UserFormModel = {
  id?: ApiId
  phone: string
  username: string
  password: string
  nickname: string
  email: string
  gender: UserGender
  avatarCode: string
  departmentId: ApiId | ''
  status: UserStatus
  roleIds: ApiId[]
}

const authStore = useAuthStore()
const userTableLoading = ref(false)
const userTableError = ref('')
const drawerVisible = ref(false)
const drawerMode = ref<'create' | 'edit'>('create')
const drawerLoading = ref(false)
const userSaving = ref(false)
const roleLoading = ref(false)
const avatarLoading = ref(false)
const departmentLoading = ref(false)
const resetDialogVisible = ref(false)
const resetLoading = ref(false)
const resetPasswordValue = ref('')
const generatedPassword = ref('')

const formRef = ref<FormInstance>()
const users = ref<UserVO[]>([])
const roles = ref<RoleVO[]>([])
const avatarOptions = ref<AvatarOption[]>([])
const departmentOptions = ref<DepartmentOption[]>([])
const departmentTreeOptions = ref<DepartmentTreeOption[]>([])
const total = ref(0)
const resetTarget = ref<UserVO | null>(null)
let userLoadSerial = 0

const query = reactive<UserSearchRequest>({
  page: 1,
  size: 10,
  keyword: '',
  departmentId: undefined,
  roleCode: undefined,
  status: undefined,
})

const form = reactive<UserFormModel>({
  phone: '',
  username: '',
  password: '',
  nickname: '',
  email: '',
  gender: 'MALE',
  avatarCode: 'avatar_male_01',
  departmentId: '',
  status: 'ACTIVE',
  roleIds: [],
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
const statusLabels: Record<UserStatus, string> = {
  ACTIVE: '启用',
  DISABLED: '停用',
  LOCKED: '锁定',
}
const statusTagTypes: Record<UserStatus, 'success' | 'danger' | 'warning'> = {
  ACTIVE: 'success',
  DISABLED: 'danger',
  LOCKED: 'warning',
}

const roleFilterOptions = computed(() => {
  if (roles.value.length) {
    return roles.value.map((role) => ({ label: `${role.name} / ${role.code}`, value: role.code }))
  }
  return [
    { label: '普通用户 / USER', value: 'USER' },
    { label: '处理人 / AGENT', value: 'AGENT' },
    { label: '团队负责人 / MANAGER', value: 'MANAGER' },
    { label: '管理员 / ADMIN', value: 'ADMIN' },
  ]
})

const defaultRoleIds = computed(() => {
  const userRole = roles.value.find((role) => role.code === 'USER')
  return userRole ? [userRole.id] : roles.value[0] ? [roles.value[0].id] : []
})
const editingCurrentUser = computed(() => Boolean(form.id && authStore.currentUser?.id === form.id))

const userRules: FormRules<UserFormModel> = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: phonePattern, message: '请输入 11 位中国大陆手机号', trigger: 'blur' },
  ],
  username: [{ max: 64, message: '用户名不能超过 64 个字符', trigger: 'blur' }],
  password: [
    {
      validator: (_rule, value: string, callback) => {
        if (drawerMode.value === 'edit') {
          callback()
          return
        }
        if (!value) {
          callback(new Error('请输入初始密码'))
          return
        }
        if (value.length < 8 || value.length > 64) {
          callback(new Error('密码长度需为 8-64 位'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { max: 64, message: '昵称不能超过 64 个字符', trigger: 'blur' },
  ],
  email: [{ type: 'email', message: '请输入有效邮箱', trigger: 'blur' }],
  departmentId: [{ required: true, message: '请选择主属部门', trigger: 'change' }],
  roleIds: [{ type: 'array', required: true, min: 1, message: '请至少选择一个角色', trigger: 'change' }],
}

// 用户管理页只编排前端交互，账号唯一性、角色有效性、会话踢出和审计日志由后端统一处理。
async function loadUsers() {
  const currentSerial = ++userLoadSerial
  userTableLoading.value = true
  userTableError.value = ''
  try {
    const result = await searchUsers({
      page: query.page,
      size: query.size,
      keyword: query.keyword?.trim() || undefined,
      departmentId: query.departmentId || undefined,
      roleCode: query.roleCode || undefined,
      status: query.status,
    })
    if (currentSerial !== userLoadSerial) {
      return
    }
    users.value = result.records
    total.value = result.total
  } catch (error) {
    if (isRequestCanceled(error) || currentSerial !== userLoadSerial) {
      return
    }
    userTableError.value = error instanceof Error ? error.message : '用户列表加载失败'
  } finally {
    if (currentSerial === userLoadSerial) {
      userTableLoading.value = false
    }
  }
}

async function loadRoles() {
  roleLoading.value = true
  try {
    const result = await searchRoles({ page: 1, size: 100, enabled: true }, 'users:role-options')
    roles.value = result.records
  } finally {
    roleLoading.value = false
  }
}

// 用户管理页筛选和表单共用后端部门树，部门增删改后刷新即可拿到最新组织结构。
async function loadDepartmentOptions() {
  departmentLoading.value = true
  try {
    const departments = await getDepartmentTree({ enabled: true })
    departmentOptions.value = flattenDepartmentOptions(departments)
    departmentTreeOptions.value = buildDepartmentTreeOptions(departments)
  } finally {
    departmentLoading.value = false
  }
}

async function loadAvatarOptions(gender = form.gender) {
  avatarLoading.value = true
  try {
    const result = await getAvatarOptions(gender)
    avatarOptions.value = result.options
  } catch {
    const genderPrefix = gender === 'FEMALE' ? 'avatar_female_' : 'avatar_male_'
    avatarOptions.value = fallbackAvatarOptions.filter((option) => option.avatarCode.startsWith(genderPrefix))
  } finally {
    if (!avatarOptions.value.some((option) => option.avatarCode === form.avatarCode)) {
      form.avatarCode = avatarOptions.value[0]?.avatarCode ?? ''
    }
    avatarLoading.value = false
  }
}

async function refreshAll() {
  await Promise.allSettled([loadRoles(), loadDepartmentOptions(), loadAvatarOptions()])
  await loadUsers()
}

function handleSearch() {
  debouncedSearch.cancel()
  query.page = 1
  loadUsers()
}

// 关键词输入使用短防抖，避免连续敲字反复打列表接口；显式查询、筛选和分页仍立即执行。
const debouncedSearch = createDebouncedFn(() => {
  handleSearch()
}, 400)

function handleKeywordInput() {
  debouncedSearch()
}

function resetQuery() {
  debouncedSearch.cancel()
  query.keyword = ''
  query.departmentId = undefined
  query.roleCode = undefined
  query.status = undefined
  query.page = 1
  loadUsers()
}

function handlePageChange(page: number) {
  query.page = page
  loadUsers()
}

function handleSizeChange(size: number) {
  query.size = size
  query.page = 1
  loadUsers()
}

function resetForm() {
  Object.assign(form, {
    id: undefined,
    phone: '',
    username: '',
    password: '',
    nickname: '',
    email: '',
    gender: 'MALE',
    avatarCode: 'avatar_male_01',
    departmentId: '',
    status: 'ACTIVE',
    roleIds: [...defaultRoleIds.value],
  })
}

async function openCreateDrawer() {
  drawerMode.value = 'create'
  resetForm()
  drawerVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
  await loadAvatarOptions(form.gender)
}

async function openEditDrawer(row: UserVO) {
  drawerMode.value = 'edit'
  drawerVisible.value = true
  drawerLoading.value = true
  try {
    const detail = await getUserDetail(row.id)
    Object.assign(form, {
      id: detail.id,
      phone: detail.phone,
      username: detail.username ?? '',
      password: '',
      nickname: detail.nickname ?? '',
      email: detail.email ?? '',
      gender: detail.gender ?? 'MALE',
      avatarCode: detail.avatarCode ?? (detail.gender === 'FEMALE' ? 'avatar_female_01' : 'avatar_male_01'),
      departmentId: detail.departmentId ?? '',
      status: detail.status,
      roleIds: detail.roles.map((role) => role.id),
    })
    await nextTick()
    formRef.value?.clearValidate()
    await loadAvatarOptions(form.gender)
  } finally {
    drawerLoading.value = false
  }
}

function optionalTrim(value: string) {
  const nextValue = value.trim()
  return nextValue || undefined
}

async function submitUser() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  userSaving.value = true
  try {
    if (drawerMode.value === 'create') {
      const payload: UserCreateRequest = {
        phone: form.phone.trim(),
        username: optionalTrim(form.username),
        password: form.password,
        nickname: form.nickname.trim(),
        email: optionalTrim(form.email),
        gender: form.gender,
        avatarCode: form.avatarCode || undefined,
        departmentId: form.departmentId,
        status: form.status,
        roleIds: form.roleIds,
      }
      await createUser(payload)
      ElMessage.success('用户已创建')
    } else if (form.id) {
      const payload: UserUpdateRequest = {
        phone: form.phone.trim(),
        nickname: form.nickname.trim(),
        email: optionalTrim(form.email),
        gender: form.gender,
        avatarCode: form.avatarCode || undefined,
        departmentId: form.departmentId,
        status: form.status,
      }
      await updateUser(form.id, payload)
      await updateUserRoles(form.id, form.roleIds)
      ElMessage.success('用户已保存')
    }
    drawerVisible.value = false
    await loadUsers()
  } finally {
    userSaving.value = false
  }
}

function isCurrentUser(row: UserVO) {
  return authStore.currentUser?.id === row.id
}

async function changeStatus(row: UserVO, status: UserStatus) {
  if (isCurrentUser(row) && status !== 'ACTIVE') {
    ElMessage.warning('不能停用或锁定当前登录账号')
    return
  }
  const { value } = await ElMessageBox.prompt(`确认将“${displayUserName(row)}”调整为${statusLabels[status]}？`, '调整用户状态', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    inputPlaceholder: '原因可选，最多 255 个字符',
    inputType: 'textarea',
    inputPattern: /^.{0,255}$/,
    inputErrorMessage: '原因不能超过 255 个字符',
  })
  await updateUserStatus(row.id, status, value?.trim() || undefined)
  ElMessage.success('用户状态已更新')
  await loadUsers()
}

function handleStatusCommand(row: UserVO, command: string | number | object) {
  changeStatus(row, command as UserStatus)
}

async function confirmDeleteUser(row: UserVO) {
  if (isCurrentUser(row)) {
    ElMessage.warning('不能删除当前登录账号')
    return
  }
  await ElMessageBox.confirm(`确认删除用户“${displayUserName(row)}”？该操作会逻辑删除账号并解除角色关系。`, '删除用户', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await deleteUser(row.id)
  ElMessage.success('用户已删除')
  await loadUsers()
}

function openResetDialog(row: UserVO) {
  resetTarget.value = row
  resetPasswordValue.value = ''
  generatedPassword.value = ''
  resetDialogVisible.value = true
}

async function submitResetPassword() {
  if (!resetTarget.value) {
    return
  }
  const password = resetPasswordValue.value.trim()
  if (password && (password.length < 8 || password.length > 64)) {
    ElMessage.warning('新密码长度需为 8-64 位')
    return
  }
  resetLoading.value = true
  try {
    const result = await resetUserPassword(resetTarget.value.id, password || undefined)
    generatedPassword.value = result.temporaryPassword
    ElMessage.success('密码已重置')
  } finally {
    resetLoading.value = false
  }
}

async function copyGeneratedPassword() {
  if (!generatedPassword.value) {
    return
  }
  await navigator.clipboard.writeText(generatedPassword.value)
  ElMessage.success('临时密码已复制')
}

function displayUserName(row: UserVO) {
  return row.nickname || row.username || row.phone
}

function departmentName(id?: ApiId) {
  return departmentOptions.value.find((item) => item.value === id)?.label.trim() ?? '-'
}

function roleText(row: UserVO) {
  return row.roles.map((role) => role.code).join(' / ') || '-'
}

function statusTagType(status: UserStatus) {
  return statusTagTypes[status] ?? 'info'
}

watch(
  () => form.gender,
  async (gender) => {
    if (!drawerVisible.value) {
      return
    }
    form.avatarCode = gender === 'FEMALE' ? 'avatar_female_01' : 'avatar_male_01'
    await loadAvatarOptions(gender)
  },
)

onMounted(refreshAll)

onBeforeUnmount(() => {
  debouncedSearch.cancel()
})
</script>

<template>
  <section class="page-stack user-page">
    <PageHeader title="用户管理" description="用户增删改查、启停、重置密码、分配角色">
      <template #actions>
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
        <el-button type="primary" :icon="CirclePlus" @click="openCreateDrawer">新增用户</el-button>
      </template>
    </PageHeader>

    <section class="page-panel user-page__filters">
      <el-form class="user-filter-form" label-position="top" @submit.prevent="handleSearch">
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            clearable
            placeholder="姓名 / 邮箱 / 手机号"
            @input="handleKeywordInput"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="主属部门">
          <el-tree-select
            v-model="query.departmentId"
            :data="departmentTreeOptions"
            :loading="departmentLoading"
            check-strictly
            clearable
            filterable
            node-key="value"
            placeholder="全部部门"
            empty-text="暂无部门"
            :render-after-expand="false"
            @change="handleSearch"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="query.roleCode" :loading="roleLoading" clearable placeholder="全部角色" @change="handleSearch">
            <el-option v-for="role in roleFilterOptions" :key="role.value" :label="role.label" :value="role.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部状态" @change="handleSearch">
            <el-option
              v-for="status in USER_STATUS_OPTIONS"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
        </el-form-item>
        <div class="user-filter-form__actions">
          <el-button type="primary" :icon="Search" native-type="submit">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </div>
      </el-form>
    </section>

    <DataTable :loading="userTableLoading" :error="userTableError" :empty="users.length === 0" @retry="loadUsers">
      <el-table :data="users" row-key="id">
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }: { row: UserVO }">
            <div class="user-cell">
              <el-avatar :size="34" class="user-cell__avatar">{{ displayUserName(row).slice(0, 1) }}</el-avatar>
              <div>
                <strong>{{ displayUserName(row) }}</strong>
                <span>{{ row.username || row.phone }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="手机号" prop="phone" min-width="128" />
        <el-table-column label="邮箱" min-width="180">
          <template #default="{ row }: { row: UserVO }">{{ row.email || '-' }}</template>
        </el-table-column>
        <el-table-column label="部门" min-width="132">
          <template #default="{ row }: { row: UserVO }">{{ row.departmentName || departmentName(row.departmentId) }}</template>
        </el-table-column>
        <el-table-column label="角色" min-width="180">
          <template #default="{ row }: { row: UserVO }">
            <div class="role-tags">
              <el-tag v-for="role in row.roles" :key="role.id" size="small" type="primary">{{ role.code }}</el-tag>
              <span v-if="!row.roles.length">-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }: { row: UserVO }">
            <el-tag :type="statusTagType(row.status)">{{ statusLabels[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="150">
          <template #default="{ row }: { row: UserVO }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }: { row: UserVO }">
            <el-tooltip content="编辑用户">
              <el-button :icon="Edit" text type="primary" @click="openEditDrawer(row)" />
            </el-tooltip>
            <el-tooltip :content="`角色：${roleText(row)}`">
              <el-button :icon="Key" text type="primary" @click="openEditDrawer(row)" />
            </el-tooltip>
            <el-tooltip content="重置密码">
              <el-button :icon="RefreshRight" text type="warning" @click="openResetDialog(row)" />
            </el-tooltip>
            <el-dropdown trigger="click" @command="handleStatusCommand(row, $event)">
              <el-button :icon="SwitchButton" text type="primary" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="ACTIVE" :disabled="row.status === 'ACTIVE'">启用</el-dropdown-item>
                  <el-dropdown-item command="DISABLED" :disabled="row.status === 'DISABLED' || isCurrentUser(row)">
                    停用
                  </el-dropdown-item>
                  <el-dropdown-item command="LOCKED" :disabled="row.status === 'LOCKED' || isCurrentUser(row)">
                    锁定
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-tooltip :content="isCurrentUser(row) ? '不能删除当前登录账号' : '删除用户'">
              <el-button :icon="Delete" text type="danger" :disabled="isCurrentUser(row)" @click="confirmDeleteUser(row)" />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
      <PaginationBar
        :page="query.page ?? 1"
        :size="query.size ?? 10"
        :total="total"
        @update:page="handlePageChange"
        @update:size="handleSizeChange"
      />
    </DataTable>

    <el-drawer
      v-model="drawerVisible"
      :title="drawerMode === 'create' ? '新增用户' : '编辑用户'"
      size="520px"
      destroy-on-close
    >
      <div v-loading="drawerLoading" class="user-drawer">
        <el-form ref="formRef" :model="form" :rules="userRules" label-position="top">
          <section class="user-drawer__section">
            <h3>账号资料</h3>
            <div class="user-drawer__grid">
              <el-form-item label="手机号" prop="phone">
                <el-input v-model="form.phone" maxlength="11" placeholder="请输入手机号" />
              </el-form-item>
              <el-form-item label="用户名" prop="username">
                <el-input v-model="form.username" maxlength="64" placeholder="未填时默认使用手机号" />
              </el-form-item>
              <el-form-item v-if="drawerMode === 'create'" label="初始密码" prop="password">
                <el-input v-model="form.password" show-password type="password" placeholder="请输入 8-64 位密码" />
              </el-form-item>
              <el-form-item label="昵称" prop="nickname">
                <el-input v-model="form.nickname" maxlength="64" placeholder="请输入昵称" />
              </el-form-item>
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="form.email" maxlength="128" placeholder="请输入邮箱" />
              </el-form-item>
              <el-form-item label="主属部门" prop="departmentId">
                <el-tree-select
                  v-model="form.departmentId"
                  class="user-drawer__full"
                  :data="departmentTreeOptions"
                  :loading="departmentLoading"
                  check-strictly
                  filterable
                  node-key="value"
                  placeholder="请选择主属部门"
                  empty-text="暂无部门"
                  :render-after-expand="false"
                />
              </el-form-item>
            </div>
          </section>

          <section class="user-drawer__section">
            <h3>头像与状态</h3>
            <el-form-item label="性别">
              <el-segmented v-model="form.gender" :options="genderOptions" />
            </el-form-item>
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
            <el-form-item label="账号状态">
              <el-select v-model="form.status" class="user-drawer__full" :disabled="editingCurrentUser">
                <el-option
                  v-for="status in USER_STATUS_OPTIONS"
                  :key="status.value"
                  :label="status.label"
                  :value="status.value"
                />
              </el-select>
              <p v-if="editingCurrentUser" class="user-drawer__hint">当前登录账号不允许在此调整状态</p>
            </el-form-item>
          </section>

          <section class="user-drawer__section">
            <h3>角色绑定</h3>
            <el-form-item label="角色" prop="roleIds">
              <el-select
                v-model="form.roleIds"
                class="user-drawer__full"
                :loading="roleLoading"
                :disabled="editingCurrentUser"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="请选择角色"
              >
                <el-option
                  v-for="role in roles"
                  :key="role.id"
                  :label="`${role.name} / ${role.code}`"
                  :value="role.id"
                />
              </el-select>
              <p v-if="editingCurrentUser" class="user-drawer__hint">当前登录账号不允许在此调整角色</p>
            </el-form-item>
          </section>
        </el-form>

        <div class="user-drawer__footer">
          <el-button @click="drawerVisible = false">取消</el-button>
          <el-button type="primary" :loading="userSaving" @click="submitUser">保存</el-button>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="resetDialogVisible" title="重置密码" width="460px" destroy-on-close>
      <div class="reset-dialog">
        <p>
          为用户 <strong>{{ resetTarget ? displayUserName(resetTarget) : '-' }}</strong> 重置登录密码。留空时后端会生成一次性临时密码。
        </p>
        <el-input v-model="resetPasswordValue" show-password type="password" placeholder="可选：输入 8-64 位新密码" />
        <el-alert
          v-if="generatedPassword"
          type="success"
          :closable="false"
          show-icon
          title="临时密码仅返回一次，请立即复制并安全发送给用户"
        >
          <template #default>
            <div class="reset-dialog__password">
              <code>{{ generatedPassword }}</code>
              <el-button size="small" @click="copyGeneratedPassword">复制</el-button>
            </div>
          </template>
        </el-alert>
      </div>
      <template #footer>
        <el-button @click="resetDialogVisible = false">关闭</el-button>
        <el-button type="primary" :loading="resetLoading" @click="submitResetPassword">确认重置</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.user-page {
  min-width: 0;
}

.user-page__filters {
  padding: 16px;
}

.user-filter-form {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) minmax(160px, 1fr) minmax(160px, 1fr) minmax(120px, 0.8fr) auto;
  gap: 12px;
  align-items: end;
}

.user-filter-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.user-filter-form__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 1px;
}

.user-cell {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.user-cell__avatar {
  background: #05788a;
  color: #fff;
  font-weight: 700;
}

.user-cell strong,
.user-cell span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-cell strong {
  color: var(--ops-primary-color);
  font-weight: 650;
}

.user-cell span {
  margin-top: 2px;
  color: var(--ops-text-secondary);
  font-size: 12px;
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.user-drawer {
  min-height: calc(100vh - 120px);
}

.user-drawer__section {
  margin-bottom: 18px;
}

.user-drawer__section h3 {
  margin: 0 0 12px;
  color: var(--ops-text-primary);
  font-size: 16px;
  font-weight: 650;
}

.user-drawer__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 12px;
}

.user-drawer__full {
  width: 100%;
}

.user-drawer__hint {
  margin: 6px 0 0;
  color: var(--ops-text-secondary);
  font-size: 12px;
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

.user-drawer__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--ops-border-color);
  padding-top: 16px;
}

.reset-dialog {
  display: grid;
  gap: 14px;
}

.reset-dialog p {
  margin: 0;
  color: var(--ops-text-secondary);
  line-height: 1.6;
}

.reset-dialog__password {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.reset-dialog__password code {
  overflow: auto;
  color: var(--ops-text-primary);
  font-size: 14px;
}

@media (max-width: 1120px) {
  .user-filter-form {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .user-filter-form,
  .user-drawer__grid,
  .avatar-options {
    grid-template-columns: 1fr;
  }
}
</style>
