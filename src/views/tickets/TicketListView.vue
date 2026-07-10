<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { CirclePlus, Refresh, Search } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { getTicketCategoryTree, searchTickets } from '@/api/modules/tickets'
import { searchTeams } from '@/api/modules/teams'
import PageHeader from '@/components/common/PageHeader.vue'
import TicketTable from '@/components/business/TicketTable.vue'
import { TICKET_PRIORITY_OPTIONS, TICKET_STATUS_OPTIONS } from '@/constants/ticket'
import { createDebouncedFn } from '@/utils/debounce'
import { resolveTicketRouteQuery } from '@/utils/ticket-route-query'
import type { ApiId } from '@/types/api'
import type { TeamVO } from '@/types/organization'
import type { TicketCategoryVO, TicketListItemVO, TicketPriority, TicketStatus } from '@/types/ticket'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const error = ref('')
const records = ref<TicketListItemVO[]>([])
const total = ref(0)
const categories = ref<TicketCategoryVO[]>([])
const teams = ref<TeamVO[]>([])

const query = reactive({
  page: 1,
  size: 10,
  ticketNo: '',
  keyword: '',
  status: undefined as TicketStatus | undefined,
  priority: undefined as TicketPriority | undefined,
  categoryId: undefined as ApiId | undefined,
  teamId: undefined as ApiId | undefined,
  overdue: undefined as boolean | undefined,
})

async function loadOptions() {
  const [categoryResult, teamResult] = await Promise.allSettled([
    getTicketCategoryTree({ enabled: true }),
    searchTeams({ page: 1, size: 100, enabled: true }),
  ])
  if (categoryResult.status === 'fulfilled') {
    categories.value = categoryResult.value
  }
  if (teamResult.status === 'fulfilled') {
    teams.value = teamResult.value.records
  }
}

async function loadTickets() {
  loading.value = true
  error.value = ''
  try {
    const result = await searchTickets({
      page: query.page,
      size: query.size,
      ticketNo: query.ticketNo.trim() || undefined,
      keyword: query.keyword.trim() || undefined,
      status: query.status,
      priority: query.priority,
      categoryId: query.categoryId,
      teamId: query.teamId,
      overdue: query.overdue,
    })
    records.value = result.records
    total.value = result.total
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '工单列表加载失败'
  } finally {
    loading.value = false
  }
}

function searchFromFirstPage() {
  query.page = 1
  loadTickets()
}

const debouncedSearch = createDebouncedFn(searchFromFirstPage, 400)

function resetQuery() {
  debouncedSearch.cancel()
  Object.assign(query, {
    page: 1,
    ticketNo: '',
    keyword: '',
    status: undefined,
    priority: undefined,
    categoryId: undefined,
    teamId: undefined,
    overdue: undefined,
  })
  loadTickets()
}

function changePage(page: number) {
  query.page = page
  loadTickets()
}

function changeSize(size: number) {
  query.size = size
  query.page = 1
  loadTickets()
}

function openDetail(ticket: TicketListItemVO) {
  router.push(`/tickets/${ticket.id}`)
}

function editDraft(ticket: TicketListItemVO) {
  router.push({ path: '/tickets/create', query: { id: ticket.id } })
}

// 看板搜索和外部直达链接通过查询参数传入筛选条件，列表初始化和同页跳转均需同步。
function syncRouteQuery() {
  const routeQuery = resolveTicketRouteQuery(route.query)
  query.page = 1
  query.ticketNo = routeQuery.ticketNo
  query.keyword = routeQuery.keyword
}

watch(
  () => [route.query.ticketNo, route.query.keyword],
  () => {
    syncRouteQuery()
    loadTickets()
  },
  { immediate: true },
)

onMounted(async () => {
  await loadOptions()
})

onBeforeUnmount(() => debouncedSearch.cancel())
</script>

<template>
  <section class="page-stack ticket-list-page">
    <PageHeader title="工单列表" description="按编号、标题、状态、优先级、分类和团队快速定位工单">
      <template #actions>
        <el-button :icon="Refresh" @click="loadTickets">刷新</el-button>
        <el-button type="primary" :icon="CirclePlus" @click="router.push('/tickets/create')">创建工单</el-button>
      </template>
    </PageHeader>

    <section class="page-panel ticket-list-page__filters">
      <el-form label-position="top" @submit.prevent="searchFromFirstPage">
        <div class="ticket-list-page__filter-grid">
          <el-form-item label="工单编号">
            <el-input v-model="query.ticketNo" clearable placeholder="TK2026..." @input="debouncedSearch" />
          </el-form-item>
          <el-form-item label="标题关键词">
            <el-input v-model="query.keyword" clearable placeholder="标题或问题描述" @input="debouncedSearch" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部状态" @change="searchFromFirstPage">
              <el-option v-for="item in TICKET_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="query.priority" clearable placeholder="全部优先级" @change="searchFromFirstPage">
              <el-option v-for="item in TICKET_PRIORITY_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="分类">
            <el-tree-select
              v-model="query.categoryId"
              :data="categories"
              :props="{ value: 'id', label: 'name', children: 'children' }"
              clearable
              check-strictly
              placeholder="全部分类"
              @change="searchFromFirstPage"
            />
          </el-form-item>
          <el-form-item label="处理团队">
            <el-select v-model="query.teamId" clearable filterable placeholder="全部团队" @change="searchFromFirstPage">
              <el-option v-for="team in teams" :key="team.id" :label="team.name" :value="team.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="SLA 状态">
            <el-select v-model="query.overdue" clearable placeholder="全部" @change="searchFromFirstPage">
              <el-option label="已超时" :value="true" />
              <el-option label="未超时" :value="false" />
            </el-select>
          </el-form-item>
          <div class="ticket-list-page__filter-actions">
            <el-button type="primary" :icon="Search" @click="searchFromFirstPage">查询</el-button>
            <el-button @click="resetQuery">重置</el-button>
          </div>
        </div>
      </el-form>
    </section>

    <TicketTable
      :records="records"
      :loading="loading"
      :error="error"
      :page="query.page"
      :size="query.size"
      :total="total"
      show-creator
      allow-draft-edit
      @retry="loadTickets"
      @detail="openDetail"
      @edit="editDraft"
      @update:page="changePage"
      @update:size="changeSize"
    />
  </section>
</template>

<style scoped>
.ticket-list-page__filters {
  padding-bottom: 4px;
}

.ticket-list-page__filter-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(130px, 1fr)) auto;
  gap: 12px;
  align-items: end;
}

.ticket-list-page__filter-grid :deep(.el-form-item) {
  margin-bottom: 16px;
}

.ticket-list-page__filter-actions {
  display: flex;
  gap: 8px;
  padding-bottom: 16px;
}

@media (max-width: 1280px) {
  .ticket-list-page__filter-grid {
    grid-template-columns: repeat(4, minmax(150px, 1fr));
  }
}

@media (max-width: 760px) {
  .ticket-list-page__filter-grid {
    grid-template-columns: 1fr;
  }

  .ticket-list-page__filter-actions {
    padding-bottom: 12px;
  }
}
</style>
