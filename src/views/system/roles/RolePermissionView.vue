<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import {
  Check,
  CirclePlus,
  Delete,
  Edit,
  Key,
  Refresh,
  Search,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type TreeInstance } from 'element-plus'
import { createRole, deleteRole, getRoleDetail, searchRoles, updateRole, updateRolePermissions } from '@/api/modules/roles'
import { getPermissionTree } from '@/api/modules/permissions'
import PageHeader from '@/components/common/PageHeader.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import { formatDateTime } from '@/utils/format-date'
import type { ApiId } from '@/types/api'
import type { PermissionType, PermissionVO, RoleCreateRequest, RoleSearchRequest, RoleUpdateRequest, RoleVO } from '@/types/role'

type RoleFormModel = {
  id?: ApiId
  code: string
  name: string
  description: string
  enabled: boolean
  builtIn: boolean
}

const roleTableLoading = ref(false)
const roleTableError = ref('')
const permissionLoading = ref(false)
const permissionSaving = ref(false)
const roleDialogVisible = ref(false)
const roleDialogMode = ref<'create' | 'edit'>('create')
const roleFormRef = ref<FormInstance>()
const permissionTreeRef = ref<TreeInstance>()

const roles = ref<RoleVO[]>([])
const permissionTree = ref<PermissionVO[]>([])
const selectedRole = ref<RoleVO | null>(null)
const selectedRoleDetail = ref<RoleVO | null>(null)

const query = reactive<RoleSearchRequest>({
  page: 1,
  size: 10,
  keyword: '',
  enabled: undefined,
})

const roleForm = reactive<RoleFormModel>({
  code: '',
  name: '',
  description: '',
  enabled: true,
  builtIn: false,
})

const roleRules: FormRules<RoleFormModel> = {
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[A-Z][A-Z0-9_]{1,63}$/, message: '编码需以大写字母开头，仅支持大写字母、数字和下划线', trigger: 'blur' },
  ],
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { max: 64, message: '角色名称不能超过 64 个字符', trigger: 'blur' },
  ],
  description: [{ max: 255, message: '角色说明不能超过 255 个字符', trigger: 'blur' }],
}

const roleCodeLabels: Record<string, string> = {
  ADMIN: '管理员',
  MANAGER: '团队负责人',
  AGENT: '处理人',
  USER: '提交人',
}

const permissionTypeLabels: Record<PermissionType, string> = {
  MENU: '菜单',
  BUTTON: '按钮',
  API: '接口',
}

const permissionTypeTag: Record<PermissionType, 'primary' | 'success' | 'warning'> = {
  MENU: 'primary',
  BUTTON: 'success',
  API: 'warning',
}

const treeProps = {
  label: 'name',
  children: 'children',
  disabled: (data: PermissionVO) => !data.enabled,
}

const total = ref(0)

const selectedRoleTitle = computed(() => {
  if (!selectedRole.value) {
    return '未选择角色'
  }
  return `${selectedRole.value.name}（${selectedRole.value.code}）`
})

const permissionStats = computed(() => {
  const flatPermissions = flattenPermissions(permissionTree.value)
  return {
    menu: flatPermissions.filter((permission) => permission.type === 'MENU').length,
    button: flatPermissions.filter((permission) => permission.type === 'BUTTON').length,
    api: flatPermissions.filter((permission) => permission.type === 'API').length,
  }
})

const permissionParentMap = computed(() => buildPermissionParentMap(permissionTree.value))

// 角色权限页以列表选择驱动右侧权限树，避免页面直接拼接接口路径或在多个弹窗中重复维护权限状态。
async function loadRoles(keepSelected = true) {
  roleTableLoading.value = true
  roleTableError.value = ''
  try {
    const result = await searchRoles({
      page: query.page,
      size: query.size,
      keyword: query.keyword?.trim() || undefined,
      enabled: query.enabled,
    })
    roles.value = result.records
    total.value = result.total

    const previousId = selectedRole.value?.id
    const nextRole = keepSelected ? roles.value.find((role) => role.id === previousId) : undefined
    selectedRole.value = nextRole ?? roles.value[0] ?? null
    if (selectedRole.value) {
      await loadRoleDetail(selectedRole.value.id)
    } else {
      selectedRoleDetail.value = null
      clearPermissionChecks()
    }
  } catch (error) {
    roleTableError.value = error instanceof Error ? error.message : '角色列表加载失败'
  } finally {
    roleTableLoading.value = false
  }
}

async function loadPermissionTree() {
  permissionLoading.value = true
  try {
    permissionTree.value = await getPermissionTree()
  } finally {
    permissionLoading.value = false
  }
}

async function loadRoleDetail(id: ApiId) {
  permissionLoading.value = true
  try {
    selectedRoleDetail.value = await getRoleDetail(id)
    await nextTick()
    permissionTreeRef.value?.setCheckedKeys(selectedRoleDetail.value.permissionIds ?? [])
  } finally {
    permissionLoading.value = false
  }
}

function clearPermissionChecks() {
  permissionTreeRef.value?.setCheckedKeys([])
}

function flattenPermissions(nodes: PermissionVO[]): PermissionVO[] {
  return nodes.flatMap((node) => [node, ...flattenPermissions(node.children ?? [])])
}

function buildPermissionParentMap(nodes: PermissionVO[], parentId?: ApiId) {
  const parentMap = new Map<ApiId, ApiId>()
  for (const node of nodes) {
    if (parentId) {
      parentMap.set(node.id, parentId)
    }
    for (const [childId, childParentId] of buildPermissionParentMap(node.children ?? [], node.id)) {
      parentMap.set(childId, childParentId)
    }
  }
  return parentMap
}

function mergeSelectedWithAncestors(selectedIds: ApiId[]) {
  const mergedIds = new Set<ApiId>()
  for (const selectedId of selectedIds) {
    mergedIds.add(selectedId)
    let parentId = permissionParentMap.value.get(selectedId)
    while (parentId) {
      mergedIds.add(parentId)
      parentId = permissionParentMap.value.get(parentId)
    }
  }
  return Array.from(mergedIds)
}

function permissionTagType(type: string) {
  return permissionTypeTag[type as PermissionType] ?? 'info'
}

function permissionTypeName(type: string) {
  return permissionTypeLabels[type as PermissionType] ?? type
}

function roleDisplayName(role: RoleVO) {
  return roleCodeLabels[role.code] ?? role.name
}

function resetQuery() {
  query.keyword = ''
  query.enabled = undefined
  query.page = 1
  loadRoles(false)
}

function handleSearch() {
  query.page = 1
  loadRoles(false)
}

function handlePageChange(page: number) {
  query.page = page
  loadRoles()
}

function handleSizeChange(size: number) {
  query.size = size
  query.page = 1
  loadRoles()
}

async function selectRole(role: RoleVO) {
  selectedRole.value = role
  await loadRoleDetail(role.id)
}

function openCreateDialog() {
  roleDialogMode.value = 'create'
  Object.assign(roleForm, {
    id: undefined,
    code: '',
    name: '',
    description: '',
    enabled: true,
    builtIn: false,
  })
  roleDialogVisible.value = true
  nextTick(() => roleFormRef.value?.clearValidate())
}

async function openEditDialog(role: RoleVO) {
  roleDialogMode.value = 'edit'
  const detail = await getRoleDetail(role.id)
  Object.assign(roleForm, {
    id: detail.id,
    code: detail.code,
    name: detail.name,
    description: detail.description ?? '',
    enabled: detail.enabled,
    builtIn: detail.builtIn,
  })
  roleDialogVisible.value = true
  nextTick(() => roleFormRef.value?.clearValidate())
}

async function submitRole() {
  const valid = await roleFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  if (roleDialogMode.value === 'create') {
    const payload: RoleCreateRequest = {
      code: roleForm.code.trim().toUpperCase(),
      name: roleForm.name.trim(),
      description: roleForm.description.trim() || undefined,
      enabled: roleForm.enabled,
      permissionIds: [],
    }
    const created = await createRole(payload)
    ElMessage.success('角色已创建')
    roleDialogVisible.value = false
    selectedRole.value = created
    await loadRoles()
    return
  }

  if (!roleForm.id) {
    return
  }
  const payload: RoleUpdateRequest = {
    name: roleForm.name.trim(),
    description: roleForm.description.trim() || undefined,
    enabled: roleForm.builtIn ? true : roleForm.enabled,
  }
  const updated = await updateRole(roleForm.id, payload)
  ElMessage.success('角色已保存')
  roleDialogVisible.value = false
  selectedRole.value = updated
  await loadRoles()
}

async function confirmDeleteRole(role: RoleVO) {
  if (role.builtIn) {
    ElMessage.warning('内置角色不允许删除')
    return
  }

  await ElMessageBox.confirm(`确认删除角色“${role.name}”？删除前请确认没有用户仍绑定该角色。`, '删除角色', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await deleteRole(role.id)
  ElMessage.success('角色已删除')
  await loadRoles(false)
}

async function savePermissions() {
  if (!selectedRole.value) {
    ElMessage.warning('请先选择角色')
    return
  }
  const checkedKeys = permissionTreeRef.value?.getCheckedKeys(false) ?? []
  // 权限树使用精确勾选模式：保存时只补齐祖先菜单，不级联保存兄弟或子孙权限。
  const permissionIds = mergeSelectedWithAncestors(checkedKeys.map(String))

  permissionSaving.value = true
  try {
    selectedRole.value = await updateRolePermissions(selectedRole.value.id, permissionIds)
    selectedRoleDetail.value = selectedRole.value
    await nextTick()
    permissionTreeRef.value?.setCheckedKeys(selectedRole.value.permissionIds ?? [])
    ElMessage.success('角色权限已保存')
    await loadRoles()
  } finally {
    permissionSaving.value = false
  }
}

async function refreshAll() {
  await loadPermissionTree()
  await loadRoles()
}

onMounted(refreshAll)
</script>

<template>
  <section class="page-stack role-page">
    <PageHeader title="角色权限管理" description="维护 RBAC 角色、菜单权限、按钮权限和接口权限">
      <template #actions>
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
        <el-button type="primary" :icon="CirclePlus" @click="openCreateDialog">新增角色</el-button>
      </template>
    </PageHeader>

    <section class="page-panel role-page__filters">
      <el-input
        v-model="query.keyword"
        class="role-page__keyword"
        clearable
        placeholder="搜索角色编码、名称"
        @keyup.enter="handleSearch"
      />
      <el-select v-model="query.enabled" clearable placeholder="启停状态">
        <el-option label="启用" :value="true" />
        <el-option label="停用" :value="false" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
      <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
    </section>

    <section class="role-page__workspace">
      <DataTable :loading="roleTableLoading" :error="roleTableError" :empty="roles.length === 0" @retry="loadRoles">
        <el-table :data="roles" row-key="id" highlight-current-row :current-row-key="selectedRole?.id" @row-click="selectRole">
          <el-table-column label="角色" min-width="180">
            <template #default="{ row }: { row: RoleVO }">
              <div class="role-cell">
                <strong>{{ row.name }}</strong>
                <span>{{ row.code }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="110">
            <template #default="{ row }: { row: RoleVO }">
              <el-tag :type="row.builtIn ? 'warning' : 'info'">{{ row.builtIn ? '内置' : '自定义' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }: { row: RoleVO }">
              <el-tag :type="row.enabled ? 'success' : 'danger'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="权限数" width="96">
            <template #default="{ row }: { row: RoleVO }">{{ row.permissionIds?.length ?? 0 }}</template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="150">
            <template #default="{ row }: { row: RoleVO }">{{ formatDateTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="136">
            <template #default="{ row }: { row: RoleVO }">
              <el-tooltip content="编辑角色">
                <el-button :icon="Edit" text type="primary" @click.stop="openEditDialog(row)" />
              </el-tooltip>
              <el-tooltip content="配置权限">
                <el-button :icon="Key" text type="primary" @click.stop="selectRole(row)" />
              </el-tooltip>
              <el-tooltip :content="row.builtIn ? '内置角色不可删除' : '删除角色'">
                <el-button :icon="Delete" text type="danger" :disabled="row.builtIn" @click.stop="confirmDeleteRole(row)" />
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

      <aside v-loading="permissionLoading" class="page-panel role-page__permissions">
        <header class="permission-header">
          <div>
            <p class="permission-header__eyebrow">当前角色</p>
            <h2>{{ selectedRoleTitle }}</h2>
            <p v-if="selectedRole" class="permission-header__meta">
              {{ roleDisplayName(selectedRole) }} · {{ selectedRole.builtIn ? '内置角色' : '自定义角色' }}
            </p>
          </div>
          <el-button type="primary" :icon="Check" :loading="permissionSaving" :disabled="!selectedRole" @click="savePermissions">
            保存权限
          </el-button>
        </header>

        <div class="permission-stats">
          <span>菜单 {{ permissionStats.menu }}</span>
          <span>按钮 {{ permissionStats.button }}</span>
          <span>接口 {{ permissionStats.api }}</span>
        </div>

        <el-empty v-if="!selectedRole" description="请选择角色" />
        <el-tree
          v-else
          ref="permissionTreeRef"
          class="permission-tree"
          :data="permissionTree"
          :props="treeProps"
          node-key="id"
          show-checkbox
          default-expand-all
          :check-strictly="true"
          :expand-on-click-node="false"
        >
          <template #default="{ data }: { data: PermissionVO }">
            <span class="permission-tree__node">
              <span>{{ data.name }}</span>
              <el-tag size="small" :type="permissionTagType(data.type)">{{ permissionTypeName(data.type) }}</el-tag>
              <small v-if="data.path">{{ data.method || 'POST' }} {{ data.path }}</small>
              <el-tag v-if="!data.enabled" size="small" type="danger">停用</el-tag>
            </span>
          </template>
        </el-tree>
      </aside>
    </section>

    <el-dialog
      v-model="roleDialogVisible"
      :title="roleDialogMode === 'create' ? '新增角色' : '编辑角色'"
      width="520px"
      destroy-on-close
    >
      <el-form ref="roleFormRef" :model="roleForm" :rules="roleRules" label-position="top">
        <el-form-item label="角色编码" prop="code">
          <el-input
            v-model="roleForm.code"
            :disabled="roleDialogMode === 'edit'"
            maxlength="64"
            placeholder="例如 SUPPORT_LEAD"
            @blur="roleForm.code = roleForm.code.trim().toUpperCase()"
          />
        </el-form-item>
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" maxlength="64" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色说明" prop="description">
          <el-input v-model="roleForm.description" maxlength="255" placeholder="请输入角色说明" :rows="3" type="textarea" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="roleForm.enabled" :disabled="roleForm.builtIn" active-text="启用" inactive-text="停用" />
          <span v-if="roleForm.builtIn" class="role-dialog__hint">内置角色不允许停用</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRole">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.role-page {
  min-width: 0;
}

.role-page__filters {
  display: grid;
  grid-template-columns: minmax(220px, 320px) 160px auto auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.role-page__keyword {
  width: 100%;
}

.role-page__workspace {
  display: grid;
  grid-template-columns: minmax(600px, 1fr) minmax(340px, 380px);
  gap: 16px;
  align-items: start;
}

.role-cell {
  display: grid;
  gap: 4px;
}

.role-cell strong {
  color: var(--ops-text-primary);
  font-weight: 650;
}

.role-cell span {
  color: var(--ops-text-secondary);
  font-size: 12px;
}

.role-page__permissions {
  min-height: 620px;
  padding: 18px;
}

.permission-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.permission-header h2 {
  margin: 4px 0 0;
  color: var(--ops-text-primary);
  font-size: 18px;
  font-weight: 650;
}

.permission-header__eyebrow,
.permission-header__meta {
  margin: 0;
  color: var(--ops-text-secondary);
  font-size: 13px;
}

.permission-header__meta {
  margin-top: 6px;
}

.permission-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 16px 0;
}

.permission-stats span {
  display: grid;
  place-items: center;
  height: 34px;
  border: 1px solid #dbe4f0;
  border-radius: 6px;
  background: #f7f9fc;
  color: #2f3a4a;
  font-size: 13px;
}

.permission-tree {
  max-height: 520px;
  overflow: auto;
  border-top: 1px solid var(--ops-border-color);
  padding-top: 12px;
}

.permission-tree__node {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.permission-tree__node small {
  overflow: hidden;
  max-width: 210px;
  color: var(--ops-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-dialog__hint {
  margin-left: 12px;
  color: var(--ops-text-secondary);
  font-size: 13px;
}

@media (max-width: 1180px) {
  .role-page__workspace {
    grid-template-columns: 1fr;
  }

  .role-page__permissions {
    min-height: 420px;
  }
}

@media (max-width: 760px) {
  .role-page__filters {
    grid-template-columns: 1fr;
  }

  .permission-header {
    display: grid;
  }
}
</style>
