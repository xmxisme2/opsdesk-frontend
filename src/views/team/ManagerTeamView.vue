<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { searchManagedTeams, searchTeamCandidates, searchTeamMembers, updateTeamMembers, type TeamCandidateUserVO } from '@/api/modules/teams'
import type { TeamMemberVO, TeamVO } from '@/types/organization'
import type { ApiId } from '@/types/api'

const loading = ref(false)
const error = ref('')
const keyword = ref('')
const teams = ref<TeamVO[]>([])
const selectedTeam = ref<TeamVO | null>(null)
const members = ref<TeamMemberVO[]>([])
const candidates = ref<TeamCandidateUserVO[]>([])
const selectedIds = ref<ApiId[]>([])
const saving = ref(false)
const leaderIds = computed(() => members.value.filter((item) => item.leader).map((item) => item.user.id))

async function loadTeams() {
  loading.value = true
  error.value = ''
  try {
    teams.value = (await searchManagedTeams({ page: 1, size: 100, keyword: keyword.value.trim() || undefined })).records
    if (!selectedTeam.value || !teams.value.some((item) => item.id === selectedTeam.value?.id)) await selectTeam(teams.value[0] || null)
  } catch (loadError) { error.value = loadError instanceof Error ? loadError.message : '负责团队加载失败' }
  finally { loading.value = false }
}

async function selectTeam(team: TeamVO | null) {
  selectedTeam.value = team
  members.value = []
  candidates.value = []
  selectedIds.value = []
  if (!team) return
  const [memberPage, candidatePage] = await Promise.all([
    searchTeamMembers(team.id, { page: 1, size: 100 }),
    searchTeamCandidates(team.id, { page: 1, size: 100 }),
  ])
  members.value = memberPage.records
  candidates.value = candidatePage.records
  selectedIds.value = members.value.map((item) => item.user.id)
}

async function saveMembers() {
  if (!selectedTeam.value) return
  if (!leaderIds.value.every((id) => selectedIds.value.includes(id))) {
    ElMessage.warning('负责人不能从成员列表移除')
    return
  }
  saving.value = true
  try {
    await updateTeamMembers(selectedTeam.value.id, selectedIds.value.map((userId) => ({ userId, leader: leaderIds.value.includes(userId) })))
    ElMessage.success('团队普通成员已更新')
    await selectTeam(selectedTeam.value)
  } finally { saving.value = false }
}

function candidateLabel(user: TeamCandidateUserVO) {
  return `${user.nickname || user.username || user.phone} / ${user.phone}${user.departmentName ? ` / ${user.departmentName}` : ''}`
}

onMounted(loadTeams)
</script>

<template>
  <!-- 团队负责人页面只维护本人负责团队的普通成员，负责人任免仍由管理员处理。 -->
  <section class="page-stack manager-team">
    <PageHeader title="团队成员管理" description="维护本人负责团队的普通成员，不支持调整负责人">
      <template #actions><el-input v-model="keyword" clearable placeholder="搜索负责团队" @keyup.enter="loadTeams" /><el-button @click="loadTeams">查询</el-button></template>
    </PageHeader>
    <ErrorState v-if="error" :message="error" @retry="loadTeams" />
    <div v-else v-loading="loading" class="manager-team__layout">
      <section class="page-panel manager-team__teams">
        <h2>我负责的团队</h2>
        <EmptyState v-if="!teams.length" message="暂无负责团队" />
        <button v-for="team in teams" v-else :key="team.id" type="button" :class="{ active: selectedTeam?.id === team.id }" @click="selectTeam(team)">
          <strong>{{ team.name }}</strong><span>{{ team.memberCount }} 人</span><small>{{ team.processingScope || '未配置处理范围' }}</small>
        </button>
      </section>
      <section class="page-panel manager-team__members">
        <template v-if="selectedTeam">
          <header><div><h2>{{ selectedTeam.name }}成员</h2><p>负责人由管理员维护，保存时必须原样保留。</p></div><el-button type="primary" :loading="saving" @click="saveMembers">保存成员</el-button></header>
          <el-select v-model="selectedIds" multiple filterable collapse-tags collapse-tags-tooltip placeholder="搜索并选择成员">
            <el-option v-for="user in candidates" :key="user.id" :label="candidateLabel(user)" :value="user.id" :disabled="leaderIds.includes(user.id)" />
          </el-select>
          <div class="manager-team__cards">
            <article v-for="member in members" :key="member.user.id"><strong>{{ member.user.nickname || member.user.username }}</strong><el-tag :type="member.leader ? 'warning' : 'info'">{{ member.leader ? '负责人' : '普通成员' }}</el-tag><span>{{ member.user.departmentName || '-' }}</span></article>
          </div>
        </template>
        <EmptyState v-else message="请选择团队" />
      </section>
    </div>
  </section>
</template>

<style scoped>
.manager-team__layout { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 20px; min-height: 560px; }
.manager-team__teams,.manager-team__members { padding: 20px; }
.manager-team h2 { margin: 0 0 16px; color: var(--ops-text-primary); font-size: 18px; }
.manager-team__teams button { display: grid; grid-template-columns: 1fr auto; width: 100%; gap: 6px; border: 1px solid var(--ops-border-color); border-radius: 8px; background: #fff; padding: 14px; margin-bottom: 10px; text-align: left; cursor: pointer; }
.manager-team__teams button.active { border-color: var(--ops-primary-color); background: #eef5ff; }
.manager-team__teams small { grid-column: 1 / -1; color: var(--ops-text-secondary); }
.manager-team__members header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; }
.manager-team__members header h2 { margin-bottom: 6px; }.manager-team__members header p { margin: 0; color: var(--ops-text-secondary); font-size: 13px; }
.manager-team__members :deep(.el-select) { width: 100%; }
.manager-team__cards { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; margin-top: 20px; }
.manager-team__cards article { display: grid; grid-template-columns: 1fr auto; gap: 8px; border: 1px solid var(--ops-border-color); border-radius: 8px; background: #f7f9fb; padding: 14px; }
.manager-team__cards span { grid-column: 1 / -1; color: var(--ops-text-secondary); font-size: 12px; }
@media(max-width:900px){.manager-team__layout{grid-template-columns:1fr}.manager-team__cards{grid-template-columns:1fr}}
</style>
