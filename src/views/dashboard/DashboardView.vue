<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { init, use, type ECharts } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { Refresh, Search } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import {
  getAgentRanking,
  getDashboardDistributions,
  getDashboardSummary,
  getDashboardTrends,
  getOverdueTickets,
} from '@/api/modules/dashboard'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import PriorityTag from '@/components/business/PriorityTag.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import { buildDashboardMetrics, normalizePriorityDistribution } from '@/utils/dashboard-view'
import { formatDateTime } from '@/utils/format-date'
import type {
  DashboardAgentRankingItem,
  DashboardDistributionItem,
  DashboardSummary,
  DashboardTrendPoint,
} from '@/types/dashboard'
import type { PageResult } from '@/types/api'
import type { TicketListItemVO } from '@/types/ticket'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const dateRange = ref<[string, string] | null>(null)
const summary = ref<DashboardSummary | null>(null)
const trends = ref<DashboardTrendPoint[]>([])
const priorityItems = ref<DashboardDistributionItem[]>([])
const rankingItems = ref<DashboardAgentRankingItem[]>([])
const overdueTickets = ref<PageResult<TicketListItemVO>>({ records: [], page: 1, size: 5, total: 0 })
const page = ref(1)
const size = ref(5)
const trendChartEl = ref<HTMLDivElement | null>(null)
let trendChart: ECharts | null = null

use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const metrics = computed(() => (summary.value ? buildDashboardMetrics(summary.value) : []))
const priorityBars = computed(() => normalizePriorityDistribution(priorityItems.value))

const rangeParams = computed(() => ({
  dateFrom: dateRange.value?.[0],
  dateTo: dateRange.value?.[1],
}))

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    const [summaryData, trendData, priorityData, rankingData, overdueData] = await Promise.all([
      getDashboardSummary(rangeParams.value),
      getDashboardTrends({ ...rangeParams.value, range: '30d' }),
      getDashboardDistributions({ ...rangeParams.value, dimension: 'priority' }),
      getAgentRanking({ ...rangeParams.value, limit: 5 }),
      getOverdueTickets({ page: page.value, size: size.value }),
    ])
    summary.value = summaryData
    trends.value = trendData.points
    priorityItems.value = priorityData.items
    rankingItems.value = rankingData.items
    overdueTickets.value = overdueData
    await nextTick()
    renderTrendChart()
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '数据看板加载失败'
  } finally {
    loading.value = false
  }
}

function renderTrendChart() {
  if (!trendChartEl.value) {
    return
  }
  trendChart ??= init(trendChartEl.value)
  trendChart.setOption({
    color: ['#05788a', '#1252ad', '#c71f24'],
    tooltip: { trigger: 'axis' },
    grid: { left: 36, right: 20, top: 32, bottom: 32 },
    legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10 },
    xAxis: {
      type: 'category',
      data: trends.value.map((item) => item.date.slice(5)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#d1d9e3' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#edf1f5' } },
    },
    series: [
      { name: '新增', type: 'bar', barWidth: 14, data: trends.value.map((item) => item.createdCount) },
      { name: '完成', type: 'line', smooth: true, data: trends.value.map((item) => item.completedCount) },
      { name: '超时', type: 'line', smooth: true, data: trends.value.map((item) => item.overdueCount) },
    ],
  })
}

function searchTickets() {
  const text = keyword.value.trim()
  router.push(text ? { path: '/tickets', query: { keyword: text } } : '/tickets')
}

function openTicket(ticket: TicketListItemVO) {
  router.push(`/tickets/${ticket.id}`)
}

function handlePageChange(nextPage: number) {
  page.value = nextPage
  loadDashboard()
}

function handleSizeChange(nextSize: number) {
  size.value = nextSize
  page.value = 1
  loadDashboard()
}

function handleResize() {
  trendChart?.resize()
}

watch(dateRange, () => {
  page.value = 1
  loadDashboard()
})

onMounted(() => {
  loadDashboard()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  trendChart = null
})
</script>

<template>
  <!-- 数据看板按当前角色读取后端聚合结果，MANAGER 仅查看授权范围，ADMIN 可看全局。 -->
  <section class="page-stack dashboard-page">
    <PageHeader title="数据看板" description="顶部统计、趋势、优先级、处理人排行和超时列表">
      <template #actions>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
        <el-input
          v-model="keyword"
          class="dashboard-page__search"
          clearable
          :prefix-icon="Search"
          placeholder="搜索关键词"
          @keyup.enter="searchTickets"
        />
        <el-button :icon="Refresh" @click="loadDashboard">刷新</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" @retry="loadDashboard" />

    <section v-else v-loading="loading" class="dashboard-page__content">
      <div class="dashboard-page__metrics">
        <article
          v-for="item in metrics"
          :key="item.key"
          class="dashboard-page__metric"
          :class="`dashboard-page__metric--${item.tone}`"
        >
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.helper }}</small>
        </article>
      </div>

      <div class="dashboard-page__grid">
        <section class="page-panel dashboard-page__trend">
          <header>
            <h2>最近 30 天趋势</h2>
          </header>
          <EmptyState v-if="!trends.length" message="暂无趋势数据" />
          <div v-show="trends.length" ref="trendChartEl" class="dashboard-page__chart" />
        </section>

        <section class="page-panel dashboard-page__priority">
          <header>
            <h2>优先级分布</h2>
          </header>
          <EmptyState v-if="!priorityItems.length" message="暂无优先级统计" />
          <div v-else class="dashboard-page__priority-list">
            <div v-for="item in priorityBars" :key="item.name" class="dashboard-page__priority-row">
              <span>{{ item.label }}</span>
              <div class="dashboard-page__priority-track">
                <i :class="`is-${item.name.toLowerCase()}`" :style="{ width: `${item.percent}%` }" />
              </div>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </section>
      </div>

      <div class="dashboard-page__tables">
        <section class="page-panel">
          <header class="dashboard-page__table-header">
            <h2>处理人排行</h2>
          </header>
          <EmptyState v-if="!rankingItems.length" message="暂无排行数据" />
          <el-table v-else :data="rankingItems" row-key="userId">
            <el-table-column label="处理人" min-width="130">
              <template #default="{ row }: { row: DashboardAgentRankingItem }">
                <el-button text type="primary">{{ row.userName }}</el-button>
              </template>
            </el-table-column>
            <el-table-column label="完成数" prop="completedCount" width="100" />
            <el-table-column label="平均耗时" width="120">
              <template #default="{ row }: { row: DashboardAgentRankingItem }">
                {{ row.avgProcessDuration.toFixed(1) }}h
              </template>
            </el-table-column>
            <el-table-column label="超时数" prop="overdueCount" width="100" />
          </el-table>
        </section>

        <section class="page-panel">
          <header class="dashboard-page__table-header">
            <h2>超时工单</h2>
          </header>
          <EmptyState v-if="!overdueTickets.records.length" message="暂无超时工单" />
          <template v-else>
            <el-table :data="overdueTickets.records" row-key="id">
              <el-table-column label="编号" min-width="150">
                <template #default="{ row }: { row: TicketListItemVO }">
                  <el-button text type="primary" @click="openTicket(row)">{{ row.ticketNo || row.id }}</el-button>
                </template>
              </el-table-column>
              <el-table-column label="标题" min-width="150" prop="title" show-overflow-tooltip />
              <el-table-column label="优先级" width="100">
                <template #default="{ row }: { row: TicketListItemVO }">
                  <PriorityTag :priority="row.priority" />
                </template>
              </el-table-column>
              <el-table-column label="状态" width="120">
                <template #default="{ row }: { row: TicketListItemVO }">
                  <StatusTag :status="row.status" />
                </template>
              </el-table-column>
              <el-table-column label="截止时间" min-width="150">
                <template #default="{ row }: { row: TicketListItemVO }">
                  {{ formatDateTime(row.dueTime) }}
                </template>
              </el-table-column>
            </el-table>
            <PaginationBar
              :page="overdueTickets.page"
              :size="overdueTickets.size"
              :total="overdueTickets.total"
              @update:page="handlePageChange"
              @update:size="handleSizeChange"
            />
          </template>
        </section>
      </div>
    </section>
  </section>
</template>

<style scoped>
.dashboard-page__search {
  width: 240px;
}

.dashboard-page__content {
  display: grid;
  gap: 20px;
  min-height: 640px;
}

.dashboard-page__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 18px;
}

.dashboard-page__metric {
  position: relative;
  display: grid;
  gap: 8px;
  min-height: 104px;
  overflow: hidden;
  border: 1px solid var(--ops-border-color);
  border-radius: 8px;
  background: var(--ops-bg-panel);
  box-shadow: var(--ops-shadow-panel);
  padding: 16px 18px 14px;
}

.dashboard-page__metric::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  content: '';
}

.dashboard-page__metric--primary::before {
  background: var(--ops-primary-color);
}

.dashboard-page__metric--warning::before {
  background: #ba630f;
}

.dashboard-page__metric--success::before {
  background: #0d8052;
}

.dashboard-page__metric--danger::before {
  background: var(--ops-danger-color);
}

.dashboard-page__metric span,
.dashboard-page__metric small {
  color: var(--ops-text-secondary);
  font-size: 13px;
}

.dashboard-page__metric strong {
  color: var(--ops-text-primary);
  font-size: 28px;
  line-height: 1.15;
}

.dashboard-page__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.9fr);
  gap: 20px;
}

.dashboard-page__trend,
.dashboard-page__priority,
.dashboard-page__tables .page-panel {
  padding: 18px;
}

.dashboard-page__trend header,
.dashboard-page__priority header,
.dashboard-page__table-header {
  margin-bottom: 14px;
}

.dashboard-page__trend h2,
.dashboard-page__priority h2,
.dashboard-page__table-header h2 {
  margin: 0;
  color: var(--ops-text-primary);
  font-size: 18px;
}

.dashboard-page__chart {
  height: 246px;
}

.dashboard-page__priority-list {
  display: grid;
  gap: 24px;
  padding-top: 22px;
}

.dashboard-page__priority-row {
  display: grid;
  grid-template-columns: 52px minmax(100px, 1fr) 44px;
  gap: 12px;
  align-items: center;
}

.dashboard-page__priority-row span {
  color: var(--ops-text-secondary);
  font-size: 13px;
}

.dashboard-page__priority-row strong {
  color: var(--ops-text-primary);
  font-size: 13px;
}

.dashboard-page__priority-track {
  height: 18px;
  overflow: hidden;
  border-radius: 9px;
  background: #f0f2f6;
}

.dashboard-page__priority-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.dashboard-page__priority-track .is-urgent {
  background: var(--ops-danger-color);
}

.dashboard-page__priority-track .is-high {
  background: #ba630f;
}

.dashboard-page__priority-track .is-medium {
  background: var(--ops-primary-color);
}

.dashboard-page__priority-track .is-low {
  background: #0d8052;
}

.dashboard-page__tables {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.35fr);
  gap: 20px;
}

@media (max-width: 1180px) {
  .dashboard-page__metrics,
  .dashboard-page__grid,
  .dashboard-page__tables {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .dashboard-page__metrics,
  .dashboard-page__grid,
  .dashboard-page__tables {
    grid-template-columns: 1fr;
  }

  .dashboard-page__search {
    width: 100%;
  }
}
</style>
