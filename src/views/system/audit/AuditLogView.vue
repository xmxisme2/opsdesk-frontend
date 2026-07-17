<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import { isRequestCanceled } from '@/api/http'
import { searchAuditLogs, type AuditLogSearchRequest } from '@/api/modules/audit'
import { searchUsers } from '@/api/modules/users'
import DataTable from '@/components/common/DataTable.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import { createDebouncedFn } from '@/utils/debounce'
import { formatDateTime } from '@/utils/format-date'
import { auditBizTypeLabel, auditOperationTypeLabel } from '@/utils/audit-view'
import type { AuditLogVO } from '@/types/audit'
import type { BizType } from '@/types/file'
import type { UserVO } from '@/types/user'

type AuditQuery = AuditLogSearchRequest & {
  dateRange: [string, string] | []
}

const loading = ref(false)
const errorMessage = ref('')
const records = ref<AuditLogVO[]>([])
const total = ref(0)
const operatorLoading = ref(false)
const operatorOptions = ref<UserVO[]>([])
let loadSerial = 0

const query = reactive<AuditQuery>({
  page: 1,
  size: 10,
  keyword: '',
  operatorId: undefined,
  operationType: undefined,
  bizType: undefined,
  bizId: undefined,
  dateRange: [],
})

const operationTypeOptions = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'TRANSFER', 'UPLOAD', 'RESET_PASSWORD']
const bizTypeOptions: BizType[] = ['TICKET', 'COMMENT', 'ATTACHMENT', 'USER', 'ROLE', 'SYSTEM_CONFIG', 'KNOWLEDGE', 'AI']

// 操作日志页面只负责管理员检索与追溯，不提供修改或删除日志的入口。
async function loadLogs() {
  const currentSerial = ++loadSerial
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await searchAuditLogs({
      page: query.page,
      size: query.size,
      keyword: query.keyword?.trim() || undefined,
      operatorId: query.operatorId || undefined,
      operationType: query.operationType || undefined,
      bizType: query.bizType || undefined,
      bizId: query.bizId || undefined,
      dateFrom: query.dateRange[0] || undefined,
      dateTo: query.dateRange[1] || undefined,
    })
    if (currentSerial !== loadSerial) return
    records.value = result.records
    total.value = result.total
  } catch (error) {
    if (isRequestCanceled(error) || currentSerial !== loadSerial) return
    errorMessage.value = error instanceof Error ? error.message : '操作日志加载失败'
  } finally {
    if (currentSerial === loadSerial) loading.value = false
  }
}

async function loadOperators() {
  operatorLoading.value = true
  try {
    const result = await searchUsers({ page: 1, size: 100 })
    operatorOptions.value = result.records
  } finally {
    operatorLoading.value = false
  }
}

function displayUser(user: UserVO) {
  return user.nickname || user.username || user.phone
}

function search() {
  debouncedSearch.cancel()
  query.page = 1
  loadLogs()
}

const debouncedSearch = createDebouncedFn(search, 400)

function resetQuery() {
  debouncedSearch.cancel()
  query.keyword = ''
  query.operatorId = undefined
  query.operationType = undefined
  query.bizType = undefined
  query.bizId = undefined
  query.dateRange = []
  query.page = 1
  loadLogs()
}

function handlePageChange(page: number) {
  query.page = page
  loadLogs()
}

function handleSizeChange(size: number) {
  query.size = size
  query.page = 1
  loadLogs()
}

function tagType(operationType: string) {
  if (operationType === 'DELETE') return 'danger'
  if (operationType === 'LOGIN' || operationType === 'CREATE') return 'success'
  if (operationType === 'ASSIGN' || operationType === 'TRANSFER') return 'warning'
  return 'primary'
}

onMounted(() => Promise.allSettled([loadOperators(), loadLogs()]))
onBeforeUnmount(() => debouncedSearch.cancel())
</script>

<template>
  <!-- 对齐 Figma 64:961：顶部说明、紧凑筛选面板和只读日志表格。 -->
  <section class="page-stack audit-page">
    <PageHeader title="操作日志" description="按操作人、类型、业务、时间范围检索；普通用户不可删除日志">
      <template #actions>
        <el-tag type="primary" round>ADMIN</el-tag>
      </template>
    </PageHeader>

    <section class="page-panel audit-page__filters">
      <el-form class="audit-filter-form" label-position="top" @submit.prevent="search">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" clearable placeholder="内容 / 操作人 / 类型" @input="debouncedSearch" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="操作人">
          <el-select v-model="query.operatorId" :loading="operatorLoading" clearable filterable placeholder="全部操作人" @change="search">
            <el-option v-for="user in operatorOptions" :key="user.id" :label="`${displayUser(user)} / ${user.phone}`" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="query.operationType" clearable filterable placeholder="全部操作" @change="search">
          <el-option v-for="item in operationTypeOptions" :key="item" :label="auditOperationTypeLabel(item)" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务类型">
          <el-select v-model="query.bizType" clearable filterable placeholder="全部业务" @change="search">
          <el-option v-for="item in bizTypeOptions" :key="item" :label="auditBizTypeLabel(item)" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker v-model="query.dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" @change="search" />
        </el-form-item>
        <div class="audit-filter-form__actions">
          <el-button type="primary" :icon="Search" native-type="submit">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </div>
      </el-form>
    </section>

    <DataTable :loading="loading" :error="errorMessage" :empty="records.length === 0" @retry="loadLogs">
      <el-table :data="records" row-key="id">
        <el-table-column label="时间" min-width="156">
          <template #default="{ row }: { row: AuditLogVO }"><strong class="audit-time">{{ formatDateTime(row.createdAt) }}</strong></template>
        </el-table-column>
        <el-table-column label="操作人" min-width="142">
          <template #default="{ row }: { row: AuditLogVO }">{{ row.operatorName || row.operatorId || '系统任务' }}</template>
        </el-table-column>
        <el-table-column label="类型" min-width="126">
          <template #default="{ row }: { row: AuditLogVO }"><el-tag :type="tagType(row.operationType)" size="small">{{ auditOperationTypeLabel(row.operationType) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="业务" min-width="128">
          <template #default="{ row }: { row: AuditLogVO }"><span>{{ auditBizTypeLabel(row.bizType) }}</span><small>{{ row.bizId || '-' }}</small></template>
        </el-table-column>
        <el-table-column label="内容" prop="content" min-width="260" show-overflow-tooltip />
        <el-table-column label="IP" min-width="132">
          <template #default="{ row }: { row: AuditLogVO }">{{ row.requestIp || '-' }}</template>
        </el-table-column>
        <el-table-column label="User-Agent" min-width="220" show-overflow-tooltip>
          <template #default="{ row }: { row: AuditLogVO }">{{ row.userAgent || '-' }}</template>
        </el-table-column>
      </el-table>
      <PaginationBar :page="query.page ?? 1" :size="query.size ?? 10" :total="total" @update:page="handlePageChange" @update:size="handleSizeChange" />
    </DataTable>
  </section>
</template>

<style scoped>
.audit-page { min-width: 0; }
.audit-page__filters { padding: 16px; }
.audit-filter-form { display: grid; grid-template-columns: minmax(180px, 1.2fr) repeat(3, minmax(150px, 0.9fr)) minmax(250px, 1.4fr) auto; gap: 12px; align-items: end; }
.audit-filter-form :deep(.el-form-item) { margin-bottom: 0; }
.audit-filter-form :deep(.el-select), .audit-filter-form :deep(.el-date-editor) { width: 100%; }
.audit-filter-form__actions { display: flex; gap: 8px; padding-bottom: 1px; }
.audit-time { color: var(--ops-primary-color); font-size: 13px; }
small { display: block; margin-top: 3px; color: var(--ops-text-secondary); }
@media (max-width: 1280px) { .audit-filter-form { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 760px) { .audit-filter-form { grid-template-columns: 1fr; } .audit-filter-form__actions { justify-content: flex-end; } }
</style>
