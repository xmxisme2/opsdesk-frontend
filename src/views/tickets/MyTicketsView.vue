<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { CirclePlus, Refresh } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { searchTickets } from '@/api/modules/tickets'
import PageHeader from '@/components/common/PageHeader.vue'
import TicketTable from '@/components/business/TicketTable.vue'
import { TICKET_STATUS_OPTIONS } from '@/constants/ticket'
import type { TicketListItemVO, TicketStatus } from '@/types/ticket'

type TicketScope = 'created' | 'assigned' | 'watching'

const router = useRouter()
const activeScope = ref<TicketScope>('created')
const loading = ref(false)
const error = ref('')
const records = ref<TicketListItemVO[]>([])
const total = ref(0)

const query = reactive({
  page: 1,
  size: 10,
  keyword: '',
  status: undefined as TicketStatus | undefined,
})

async function loadTickets() {
  loading.value = true
  error.value = ''
  try {
    const result = await searchTickets({
      page: query.page,
      size: query.size,
      scope: activeScope.value,
      keyword: query.keyword.trim() || undefined,
      status: query.status,
    })
    records.value = result.records
    total.value = result.total
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '我的工单加载失败'
  } finally {
    loading.value = false
  }
}

function searchFromFirstPage() {
  query.page = 1
  loadTickets()
}

function resetQuery() {
  query.keyword = ''
  query.status = undefined
  query.page = 1
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

watch(activeScope, () => {
  query.page = 1
  loadTickets()
})

onMounted(loadTickets)
</script>

<template>
  <section class="page-stack my-tickets-page">
    <PageHeader title="我的工单" description="快速查看我创建、我处理和我关注的工单">
      <template #actions>
        <el-button :icon="Refresh" @click="loadTickets">刷新</el-button>
        <el-button type="primary" :icon="CirclePlus" @click="router.push('/tickets/create')">创建工单</el-button>
      </template>
    </PageHeader>

    <section class="page-panel my-tickets-page__toolbar">
      <el-tabs v-model="activeScope" class="my-tickets-page__tabs">
        <el-tab-pane label="我创建" name="created" />
        <el-tab-pane label="我处理" name="assigned" />
        <el-tab-pane label="我关注" name="watching" />
      </el-tabs>
      <div class="my-tickets-page__filters">
        <el-input
          v-model="query.keyword"
          clearable
          placeholder="搜索标题或问题描述"
          @keyup.enter="searchFromFirstPage"
          @clear="searchFromFirstPage"
        />
        <el-select v-model="query.status" clearable placeholder="全部状态" @change="searchFromFirstPage">
          <el-option v-for="item in TICKET_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" @click="searchFromFirstPage">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>
      </div>
    </section>

    <TicketTable
      :records="records"
      :loading="loading"
      :error="error"
      :page="query.page"
      :size="query.size"
      :total="total"
      :allow-draft-edit="activeScope === 'created'"
      @retry="loadTickets"
      @detail="openDetail"
      @edit="editDraft"
      @update:page="changePage"
      @update:size="changeSize"
    />
  </section>
</template>

<style scoped>
.my-tickets-page__toolbar {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(420px, auto);
  gap: 20px;
  align-items: end;
  padding-top: 6px;
  padding-bottom: 6px;
}

.my-tickets-page__tabs :deep(.el-tabs__header) {
  margin: 0;
}

.my-tickets-page__tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.my-tickets-page__filters {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 150px auto auto;
  gap: 8px;
  padding-bottom: 10px;
}

@media (max-width: 980px) {
  .my-tickets-page__toolbar {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .my-tickets-page__filters {
    grid-template-columns: 1fr;
  }
}
</style>
