<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { CirclePlus, Delete, Edit, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  createDepartment,
  deleteDepartment,
  getDepartmentTree,
  updateDepartment,
} from '@/api/modules/departments'
import {
  createTeam,
  deleteTeam,
  searchTeamMembers,
  searchTeams,
  updateTeam,
  updateTeamMembers,
  type TeamCreateRequest,
  type TeamUpdateRequest,
} from '@/api/modules/teams'
import { searchUsers } from '@/api/modules/users'
import PageHeader from '@/components/common/PageHeader.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import { flattenDepartmentOptions, type DepartmentOption } from '@/utils/department-options'
import type { ApiId } from '@/types/api'
import type { DepartmentVO, TeamVO } from '@/types/organization'
import type { UserVO } from '@/types/user'

type DepartmentFormModel = {
  id?: ApiId
  parentId?: ApiId
  name: string
  leaderId?: ApiId
  sort: number
  enabled: boolean
}

type TeamFormModel = {
  id?: ApiId
  name: string
  description: string
  processingScope: string
  enabled: boolean
  memberIds: ApiId[]
  leaderIds: ApiId[]
}

const departmentLoading = ref(false)
const teamLoading = ref(false)
const teamError = ref('')
const userLoading = ref(false)
const departmentDialogVisible = ref(false)
const teamDialogVisible = ref(false)
const departmentSaving = ref(false)
const teamSaving = ref(false)
const departmentFormRef = ref<FormInstance>()
const teamFormRef = ref<FormInstance>()

const departments = ref<DepartmentVO[]>([])
const departmentOptions = ref<DepartmentOption[]>([])
const teams = ref<TeamVO[]>([])
const users = ref<UserVO[]>([])
const total = ref(0)

const teamQuery = reactive({
  page: 1,
  size: 10,
  keyword: '',
  departmentId: undefined as ApiId | undefined,
  enabled: undefined as boolean | undefined,
})

const departmentForm = reactive<DepartmentFormModel>({
  id: undefined,
  parentId: undefined,
  name: '',
  leaderId: undefined,
  sort: 0,
  enabled: true,
})

const teamForm = reactive<TeamFormModel>({
  id: undefined,
  name: '',
  description: '',
  processingScope: '',
  enabled: true,
  memberIds: [],
  leaderIds: [],
})

const departmentRules: FormRules<DepartmentFormModel> = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
}

const teamRules: FormRules<TeamFormModel> = {
  name: [{ required: true, message: '请输入团队名称', trigger: 'blur' }],
  memberIds: [{ type: 'array', required: true, min: 1, message: '请至少选择一名成员', trigger: 'change' }],
  leaderIds: [{ type: 'array', required: true, min: 1, message: '请至少选择一名负责人', trigger: 'change' }],
}

const userOptions = computed(() =>
  users.value.map((user) => ({
    label: `${user.nickname || user.username || user.phone} / ${user.phone}`,
    value: user.id,
  })),
)

const selectedMemberOptions = computed(() => userOptions.value.filter((option) => teamForm.memberIds.includes(option.value)))

// 组织页统一加载部门树，部门选择器和团队部门筛选共用同一份真实接口数据。
async function loadDepartments() {
  departmentLoading.value = true
  try {
    departments.value = await getDepartmentTree({ enabled: undefined })
    departmentOptions.value = flattenDepartmentOptions(departments.value)
  } finally {
    departmentLoading.value = false
  }
}

async function loadTeams() {
  teamLoading.value = true
  teamError.value = ''
  try {
    const result = await searchTeams({
      page: teamQuery.page,
      size: teamQuery.size,
      keyword: teamQuery.keyword.trim() || undefined,
      departmentId: teamQuery.departmentId,
      enabled: teamQuery.enabled,
    })
    teams.value = result.records
    total.value = result.total
  } catch (error) {
    teamError.value = error instanceof Error ? error.message : '团队列表加载失败'
  } finally {
    teamLoading.value = false
  }
}

async function loadUsers() {
  userLoading.value = true
  try {
    const result = await searchUsers({ page: 1, size: 100, status: 'ACTIVE' })
    users.value = result.records
  } finally {
    userLoading.value = false
  }
}

async function refreshAll() {
  await Promise.allSettled([loadDepartments(), loadUsers()])
  await loadTeams()
}

function resetDepartmentForm(parentId?: ApiId) {
  Object.assign(departmentForm, {
    id: undefined,
    parentId,
    name: '',
    leaderId: undefined,
    sort: 0,
    enabled: true,
  })
}

function openCreateDepartment(parent?: DepartmentVO) {
  resetDepartmentForm(parent?.id)
  departmentDialogVisible.value = true
  departmentFormRef.value?.clearValidate()
}

function openEditDepartment(department: DepartmentVO) {
  Object.assign(departmentForm, {
    id: department.id,
    parentId: department.parentId,
    name: department.name,
    leaderId: department.leaderId,
    sort: department.sort ?? 0,
    enabled: department.enabled ?? true,
  })
  departmentDialogVisible.value = true
  departmentFormRef.value?.clearValidate()
}

async function submitDepartment() {
  const valid = await departmentFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  departmentSaving.value = true
  try {
    const payload = {
      parentId: departmentForm.parentId,
      name: departmentForm.name.trim(),
      leaderId: departmentForm.leaderId,
      sort: departmentForm.sort,
      enabled: departmentForm.enabled,
    }
    if (departmentForm.id) {
      await updateDepartment(departmentForm.id, payload)
      ElMessage.success('部门已保存')
    } else {
      await createDepartment(payload)
      ElMessage.success('部门已创建')
    }
    departmentDialogVisible.value = false
    await loadDepartments()
  } finally {
    departmentSaving.value = false
  }
}

async function confirmDeleteDepartment(department: DepartmentVO) {
  await ElMessageBox.confirm(`确认删除部门“${department.name}”？`, '删除部门', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await deleteDepartment(department.id)
  ElMessage.success('部门已删除')
  await loadDepartments()
}

function resetTeamForm() {
  Object.assign(teamForm, {
    id: undefined,
    name: '',
    description: '',
    processingScope: '',
    enabled: true,
    memberIds: [],
    leaderIds: [],
  })
}

function openCreateTeam() {
  resetTeamForm()
  teamDialogVisible.value = true
  teamFormRef.value?.clearValidate()
}

async function openEditTeam(team: TeamVO) {
  resetTeamForm()
  teamDialogVisible.value = true
  const members = await searchTeamMembers(team.id, { page: 1, size: 100 })
  Object.assign(teamForm, {
    id: team.id,
    name: team.name,
    description: team.description ?? '',
    processingScope: team.processingScope ?? '',
    enabled: team.enabled,
    memberIds: members.records.map((member) => member.user.id),
    leaderIds: members.records.filter((member) => member.leader).map((member) => member.user.id),
  })
  teamFormRef.value?.clearValidate()
}

function handleMemberChange() {
  teamForm.leaderIds = teamForm.leaderIds.filter((leaderId) => teamForm.memberIds.includes(leaderId))
}

async function submitTeam() {
  const valid = await teamFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  teamSaving.value = true
  try {
    if (teamForm.id) {
      const payload: TeamUpdateRequest = {
        name: teamForm.name.trim(),
        description: teamForm.description.trim() || undefined,
        processingScope: teamForm.processingScope.trim() || undefined,
        enabled: teamForm.enabled,
      }
      await updateTeam(teamForm.id, payload)
      await updateTeamMembers(
        teamForm.id,
        teamForm.memberIds.map((userId) => ({ userId, leader: teamForm.leaderIds.includes(userId) })),
      )
      ElMessage.success('团队已保存')
    } else {
      const payload: TeamCreateRequest = {
        name: teamForm.name.trim(),
        description: teamForm.description.trim() || undefined,
        processingScope: teamForm.processingScope.trim() || undefined,
        memberIds: teamForm.memberIds,
        leaderIds: teamForm.leaderIds,
        enabled: teamForm.enabled,
      }
      await createTeam(payload)
      ElMessage.success('团队已创建')
    }
    teamDialogVisible.value = false
    await loadTeams()
  } finally {
    teamSaving.value = false
  }
}

async function confirmDeleteTeam(team: TeamVO) {
  await ElMessageBox.confirm(`确认删除团队“${team.name}”？`, '删除团队', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await deleteTeam(team.id)
  ElMessage.success('团队已删除')
  await loadTeams()
}

function handleTeamSearch() {
  teamQuery.page = 1
  loadTeams()
}

function departmentNames(ids: ApiId[]) {
  if (!ids.length) {
    return '-'
  }
  return ids.map((id) => departmentOptions.value.find((item) => item.value === id)?.label.trim() ?? id).join(' / ')
}

function leaderText(team: TeamVO) {
  return team.leaderIds.length ? `${team.leaderIds.length} 人` : '-'
}

onMounted(refreshAll)
</script>

<template>
  <section class="page-stack organization-page">
    <PageHeader title="部门与团队" description="维护组织结构、处理团队、团队成员和负责人">
      <template #actions>
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
        <el-button type="primary" :icon="CirclePlus" @click="openCreateDepartment()">新增部门</el-button>
        <el-button type="primary" :icon="CirclePlus" @click="openCreateTeam">新增团队</el-button>
      </template>
    </PageHeader>

    <section class="organization-layout">
      <aside class="page-panel organization-layout__department">
        <header class="panel-heading">
          <h3>部门树</h3>
          <el-button text type="primary" :icon="CirclePlus" @click="openCreateDepartment()">根部门</el-button>
        </header>
        <el-tree
          v-loading="departmentLoading"
          class="department-tree"
          :data="departments"
          node-key="id"
          default-expand-all
          :props="{ label: 'name', children: 'children' }"
        >
          <template #default="{ data }: { data: DepartmentVO }">
            <div class="department-tree__node">
              <span>{{ data.name }}</span>
              <!-- 树节点和团队表格复用同一圆形操作规范，按钮尺寸与间距保持稳定。 -->
              <span class="department-tree__actions">
                <el-tooltip content="新增子部门"><el-button circle plain size="small" :icon="CirclePlus" @click.stop="openCreateDepartment(data)" /></el-tooltip>
                <el-tooltip content="编辑部门"><el-button circle plain size="small" type="primary" :icon="Edit" @click.stop="openEditDepartment(data)" /></el-tooltip>
                <el-tooltip content="删除部门"><el-button circle plain size="small" type="danger" :icon="Delete" @click.stop="confirmDeleteDepartment(data)" /></el-tooltip>
              </span>
            </div>
          </template>
        </el-tree>
      </aside>

      <main class="page-panel organization-layout__team">
        <header class="panel-heading">
          <h3>处理团队</h3>
          <div class="team-filters">
            <el-input
              v-model="teamQuery.keyword"
              clearable
              :prefix-icon="Search"
              placeholder="搜索团队"
              @keyup.enter="handleTeamSearch"
            />
            <el-select v-model="teamQuery.departmentId" clearable placeholder="全部部门" @change="handleTeamSearch">
              <el-option
                v-for="department in departmentOptions"
                :key="department.value"
                :label="department.label"
                :value="department.value"
              />
            </el-select>
            <el-select v-model="teamQuery.enabled" clearable placeholder="全部状态" @change="handleTeamSearch">
              <el-option label="启用" :value="true" />
              <el-option label="停用" :value="false" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="handleTeamSearch">查询</el-button>
          </div>
        </header>

        <DataTable :loading="teamLoading" :error="teamError" :empty="teams.length === 0" @retry="loadTeams">
          <el-table :data="teams" row-key="id">
            <el-table-column label="团队名称" prop="name" min-width="160" />
            <el-table-column label="处理范围" min-width="180">
              <template #default="{ row }: { row: TeamVO }">{{ row.processingScope || '-' }}</template>
            </el-table-column>
            <el-table-column label="关联部门" min-width="180">
              <template #default="{ row }: { row: TeamVO }">{{ departmentNames(row.departmentIds) }}</template>
            </el-table-column>
            <el-table-column label="成员" width="90">
              <template #default="{ row }: { row: TeamVO }">{{ row.memberCount }}</template>
            </el-table-column>
            <el-table-column label="负责人" width="100">
              <template #default="{ row }: { row: TeamVO }">{{ leaderText(row) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }: { row: TeamVO }">
                <el-tag :type="row.enabled ? 'success' : 'danger'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="92" fixed="right">
              <template #default="{ row }: { row: TeamVO }">
                <div class="team-actions">
                  <el-tooltip content="编辑团队"><el-button circle plain type="primary" :icon="Edit" @click="openEditTeam(row)" /></el-tooltip>
                  <el-tooltip content="删除团队"><el-button circle plain type="danger" :icon="Delete" @click="confirmDeleteTeam(row)" /></el-tooltip>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <PaginationBar
            :page="teamQuery.page"
            :size="teamQuery.size"
            :total="total"
            @update:page="(page) => { teamQuery.page = page; loadTeams() }"
            @update:size="(size) => { teamQuery.size = size; teamQuery.page = 1; loadTeams() }"
          />
        </DataTable>
      </main>
    </section>

    <el-dialog v-model="departmentDialogVisible" :title="departmentForm.id ? '编辑部门' : '新增部门'" width="460px">
      <el-form ref="departmentFormRef" :model="departmentForm" :rules="departmentRules" label-position="top">
        <el-form-item label="上级部门">
          <el-select v-model="departmentForm.parentId" clearable placeholder="根部门">
            <el-option
              v-for="department in departmentOptions"
              :key="department.value"
              :label="department.label"
              :value="department.value"
              :disabled="department.value === departmentForm.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="departmentForm.name" maxlength="128" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="departmentForm.leaderId" :loading="userLoading" clearable placeholder="可选">
            <el-option v-for="user in userOptions" :key="user.value" :label="user.label" :value="user.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="departmentForm.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="departmentForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="departmentDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="departmentSaving" @click="submitDepartment">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="teamDialogVisible" :title="teamForm.id ? '编辑团队' : '新增团队'" width="560px">
      <el-form ref="teamFormRef" :model="teamForm" :rules="teamRules" label-position="top">
        <el-form-item label="团队名称" prop="name">
          <el-input v-model="teamForm.name" maxlength="128" />
        </el-form-item>
        <el-form-item label="团队说明">
          <el-input v-model="teamForm.description" maxlength="255" />
        </el-form-item>
        <el-form-item label="处理范围">
          <el-input v-model="teamForm.processingScope" maxlength="255" placeholder="如：账号问题,网络访问" />
        </el-form-item>
        <el-form-item label="成员" prop="memberIds">
          <el-select
            v-model="teamForm.memberIds"
            :loading="userLoading"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="请选择成员"
            @change="handleMemberChange"
          >
            <el-option v-for="user in userOptions" :key="user.value" :label="user.label" :value="user.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人" prop="leaderIds">
          <el-select
            v-model="teamForm.leaderIds"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="负责人必须是成员"
          >
            <el-option v-for="user in selectedMemberOptions" :key="user.value" :label="user.label" :value="user.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="teamForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="teamDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="teamSaving" @click="submitTeam">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.organization-layout {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 16px;
}

.organization-layout__department,
.organization-layout__team {
  min-width: 0;
  padding: 16px;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.panel-heading h3 {
  margin: 0;
  color: var(--ops-text-primary);
  font-size: 16px;
  font-weight: 650;
}

.department-tree {
  min-height: 320px;
}

.department-tree__node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
  gap: 8px;
}

.department-tree__actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
}

.department-tree__actions :deep(.el-button),
.team-actions :deep(.el-button) {
  width: 28px;
  height: 28px;
  margin: 0;
}

.team-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.team-filters {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(150px, 0.8fr) 130px auto;
  gap: 10px;
  align-items: center;
}

:deep(.el-dialog .el-select),
:deep(.el-dialog .el-input-number) {
  width: 100%;
}

@media (max-width: 1180px) {
  .organization-layout {
    grid-template-columns: 1fr;
  }

  .team-filters {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .panel-heading,
  .team-filters {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .panel-heading {
    display: grid;
  }
}
</style>
