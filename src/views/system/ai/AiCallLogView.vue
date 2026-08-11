<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { init, use, type ECharts } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  ChatDotRound,
  CircleCheck,
  DataAnalysis,
  DocumentChecked,
  Refresh,
  Search,
  Timer,
  Warning,
} from '@element-plus/icons-vue'
import { getAiQualityOverview, searchAiQualitySamples } from '@/api/modules/ai'
import PaginationBar from '@/components/common/PaginationBar.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { formatDateTime } from '@/utils/format-date'
import type { PageResult } from '@/types/api'
import type { AiQualityOverviewVO, AiQualityResult, AiQualitySampleVO, AiQualityTrendVO } from '@/types/ai'

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const overview = ref<AiQualityOverviewVO>()
const samples = ref<PageResult<AiQualitySampleVO>>({ records: [], page: 1, size: 10, total: 0 })
const overviewLoading = ref(false)
const sampleLoading = ref(false)
const error = ref('')
const page = ref(1)
const size = ref(10)
const keyword = ref('')
const result = ref<AiQualityResult | ''>('')
const reasonCode = ref('')
const dateRange = ref<[string, string]>(defaultDateRange())
const trendGranularity = ref<'DAY' | 'MONTH'>('DAY')
const trendChartEl = ref<HTMLDivElement>()
const resultChartEl = ref<HTMLDivElement>()
let trendChart: ECharts | null = null
let resultChart: ECharts | null = null

const resultOptions: { label: string; value: AiQualityResult }[] = [
  { label: '正常回答', value: 'SUCCESS' },
  { label: '证据不足', value: 'REFUSAL' },
  { label: '调用失败', value: 'FAILED' },
  { label: '被点踩', value: 'NEGATIVE' },
]
const reasonOptions = [
  { label: '回答不正确', value: 'INCORRECT' },
  { label: '没有回答问题', value: 'NO_ANSWER' },
  { label: '引用不匹配', value: 'BAD_REFERENCE' },
  { label: '内容已过时', value: 'OUTDATED' },
  { label: '其他原因', value: 'OTHER' },
]

const metrics = computed(() => {
  const summary = overview.value?.summary
  return [
    { key: 'calls', label: '调用总量', value: formatCount(summary?.totalCalls), helper: `失败 ${summary?.failedCalls ?? 0} 次`, tone: 'primary', icon: DataAnalysis },
    { key: 'success', label: '成功率', value: `${formatRate(summary?.successRate)}%`, helper: `成功 ${summary?.successCalls ?? 0} 次`, tone: 'success', icon: CircleCheck },
    { key: 'refusal', label: '拒答率', value: `${formatRate(summary?.refusalRate)}%`, helper: `证据不足 ${summary?.insufficientCalls ?? 0} 次`, tone: 'warning', icon: Warning },
    { key: 'positive', label: '好评率', value: `${formatRate(summary?.positiveRate)}%`, helper: `${summary?.feedbackCount ?? 0} 条有效反馈`, tone: 'teal', icon: ChatDotRound },
    { key: 'duration', label: '平均耗时', value: formatDuration(summary?.averageDurationMs ?? 0), helper: `P95 ${formatDuration(summary?.p95DurationMs ?? 0)}`, tone: 'violet', icon: Timer },
    { key: 'reference', label: '平均引用', value: formatDecimal(summary?.averageReferenceCount), helper: '每次回答引用数', tone: 'slate', icon: DocumentChecked },
  ]
})

const maxReasonValue = computed(() => Math.max(1, ...(overview.value?.feedbackReasons.map((item) => item.value) ?? [0])))
const rangeParams = computed(() => ({ dateFrom: dateRange.value[0], dateTo: dateRange.value[1] }))
const dateRangeDays = computed(() => {
  const from = new Date(`${dateRange.value[0]}T00:00:00`)
  const to = new Date(`${dateRange.value[1]}T00:00:00`)
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1)
})
const resultTotal = computed(() => overview.value?.resultDistribution.reduce((total, item) => total + item.value, 0) ?? 0)
const trendData = computed(() => {
  const trends = overview.value?.trends ?? []
  if (trendGranularity.value === 'DAY') return trends

  const monthly = new Map<string, AiQualityTrendVO>()
  trends.forEach((item) => {
    const month = item.date.slice(0, 7)
    const aggregate = monthly.get(month) ?? {
      date: month,
      totalCalls: 0,
      successCalls: 0,
      insufficientCalls: 0,
      failedCalls: 0,
      negativeFeedbackCount: 0,
    }
    aggregate.totalCalls += item.totalCalls
    aggregate.successCalls += item.successCalls
    aggregate.insufficientCalls += item.insufficientCalls
    aggregate.failedCalls += item.failedCalls
    aggregate.negativeFeedbackCount += item.negativeFeedbackCount
    monthly.set(month, aggregate)
  })
  return Array.from(monthly.values())
})
const topIssue = computed(() => {
  const item = overview.value?.feedbackReasons.reduce<AiQualityOverviewVO['feedbackReasons'][number] | undefined>(
    (current, next) => !current || next.value > current.value ? next : current,
    undefined,
  )
  return item ? `${reasonLabel(item.name)} · ${item.value}` : '暂无负反馈'
})

/** 同时加载总览和样本，保证时间范围切换后各区域统计口径一致。 */
async function loadAll() {
  error.value = ''
  overviewLoading.value = true
  sampleLoading.value = true
  try {
    const [overviewData, sampleData] = await Promise.all([
      getAiQualityOverview(rangeParams.value),
      searchAiQualitySamples(sampleParams()),
    ])
    overview.value = overviewData
    samples.value = sampleData
    await nextTick()
    renderCharts()
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'AI 质量统计加载失败'
  } finally {
    overviewLoading.value = false
    sampleLoading.value = false
  }
}

async function loadSamples() {
  sampleLoading.value = true
  try {
    samples.value = await searchAiQualitySamples(sampleParams())
  } finally {
    sampleLoading.value = false
  }
}

function sampleParams() {
  return {
    page: page.value,
    size: size.value,
    ...rangeParams.value,
    result: result.value || undefined,
    reasonCode: reasonCode.value || undefined,
    keyword: keyword.value.trim() || undefined,
  }
}

function searchSamples() {
  page.value = 1
  void loadSamples()
}

function resetFilters() {
  keyword.value = ''
  result.value = ''
  reasonCode.value = ''
  page.value = 1
  void loadSamples()
}

function handlePageChange(nextPage: number) {
  page.value = nextPage
  void loadSamples()
}

function handleSizeChange(nextSize: number) {
  size.value = nextSize
  page.value = 1
  void loadSamples()
}

function renderCharts() {
  renderTrendChart()
  renderResultChart()
}

function renderTrendChart() {
  if (!trendChartEl.value || !overview.value) return
  trendChart ??= init(trendChartEl.value)
  const trends = trendData.value
  trendChart.setOption({
    color: ['#1252ad', '#f29e1f', '#d44949'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, .94)',
      borderWidth: 0,
      padding: [10, 12],
      textStyle: { color: '#fff', fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: '#94a3b8', type: 'dashed' } },
    },
    legend: { top: 0, right: 0, itemWidth: 8, itemHeight: 8, textStyle: { color: '#616e80', fontSize: 12 } },
    grid: { left: 40, right: 14, top: 42, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: trends.map((item) => trendGranularity.value === 'MONTH' ? item.date : item.date.slice(5)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#d1d9e3' } },
      axisLabel: { color: '#7a8798', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#7a8798', fontSize: 11 },
      splitLine: { lineStyle: { color: '#edf1f5', type: 'dashed' } },
    },
    series: [
      { name: '调用量', type: 'bar', barMaxWidth: 15, itemStyle: { borderRadius: [4, 4, 0, 0] }, data: trends.map((item) => item.totalCalls) },
      { name: '拒答', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { width: 2 }, data: trends.map((item) => item.insufficientCalls) },
      { name: '负反馈', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { width: 2 }, data: trends.map((item) => item.negativeFeedbackCount) },
    ],
  })
}

/** 切换聚合粒度后复用当前日统计数据重绘，避免额外请求和统计口径漂移。 */
function handleTrendGranularityChange() {
  void nextTick(renderTrendChart)
}

function renderResultChart() {
  if (!resultChartEl.value || !overview.value) return
  resultChart ??= init(resultChartEl.value)
  resultChart.setOption({
    color: ['#148c59', '#f29e1f', '#d44949', '#7c5ce5'],
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/>{c} 次 · {d}%',
      backgroundColor: 'rgba(15, 23, 42, .94)',
      borderWidth: 0,
      textStyle: { color: '#fff', fontSize: 12 },
    },
    legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#616e80', fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['58%', '76%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 4 },
      label: { show: false },
      emphasis: { scaleSize: 5 },
      data: overview.value.resultDistribution.map((item) => ({ name: resultLabel(item.name), value: item.value })),
    }],
  })
}

function resultLabel(value: string) {
  return ({ SUCCESS: '正常回答', REFUSAL: '证据不足', FAILED: '调用失败', NEGATIVE: '被点踩' } as Record<string, string>)[value] || value
}

function resultType(value: AiQualityResult) {
  return value === 'SUCCESS' ? 'success' : value === 'REFUSAL' ? 'warning' : 'danger'
}

function reasonLabel(value?: string) {
  if (!value) return '-'
  return reasonOptions.find((item) => item.value === value)?.label || value
}

function issueLabel(row: AiQualitySampleVO) {
  return row.reasonCode ? reasonLabel(row.reasonCode) : row.issueReason || '-'
}

function formatRate(value?: number) {
  return (value ?? 0).toFixed(1)
}

function formatDecimal(value?: number) {
  return (value ?? 0).toFixed(1)
}

function formatCount(value?: number) {
  return new Intl.NumberFormat('zh-CN').format(value ?? 0)
}

function formatDuration(value: number) {
  return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(1)}s`
}

function defaultDateRange(): [string, string] {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 29)
  return [localDate(from), localDate(to)]
}

function localDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function handleResize() {
  trendChart?.resize()
  resultChart?.resize()
}

onMounted(() => {
  void loadAll()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  resultChart?.dispose()
  trendChart = null
  resultChart = null
})
</script>

<template>
  <!-- AI 质量看板仅对 ADMIN 开放，所有问题和回答均使用 AI 服务已脱敏持久化内容。 -->
  <section class="page-stack ai-quality-page">
    <header class="ai-quality-page__hero">
      <div class="ai-quality-page__hero-copy">
        <div class="ai-quality-page__eyebrow"><DataAnalysis /> AI QUALITY INSIGHTS</div>
        <h1>AI 质量统计</h1>
        <p>从调用表现、回答质量到用户反馈，快速定位影响 AI 问答体验的关键问题。</p>
        <div class="ai-quality-page__scope">
          <span><i class="is-blue" />{{ dateRangeDays }} 天统计周期</span>
          <span><i class="is-green" />{{ formatCount(overview?.summary.totalCalls) }} 次调用</span>
          <span><i class="is-amber" />主要问题：{{ topIssue }}</span>
        </div>
      </div>
      <div class="ai-quality-page__hero-actions">
        <span>统计日期</span>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :clearable="false"
        />
        <el-button type="primary" :icon="Refresh" :loading="overviewLoading" @click="loadAll">刷新统计</el-button>
      </div>
    </header>

    <ErrorState v-if="error" :message="error" @retry="loadAll" />

    <template v-else>
      <section v-loading="overviewLoading" class="ai-quality-page__overview">
        <div class="ai-quality-page__metrics">
          <article v-for="item in metrics" :key="item.key" class="ai-quality-page__metric" :class="`is-${item.tone}`">
            <div class="ai-quality-page__metric-head">
              <span>{{ item.label }}</span>
              <i><component :is="item.icon" /></i>
            </div>
            <strong>{{ item.value }}</strong>
            <small><b />{{ item.helper }}</small>
          </article>
        </div>

        <div class="ai-quality-page__chart-grid">
          <section class="page-panel ai-quality-page__trend-panel">
            <header class="ai-quality-page__panel-head">
              <div><h2>质量趋势</h2><p>调用量、拒答和负反馈变化</p></div>
              <el-radio-group v-model="trendGranularity" size="small" @change="handleTrendGranularityChange">
                <el-radio-button value="DAY">按日</el-radio-button>
                <el-radio-button value="MONTH">按月</el-radio-button>
              </el-radio-group>
            </header>
            <div ref="trendChartEl" class="ai-quality-page__trend-chart" />
          </section>

          <section class="page-panel ai-quality-page__result-panel">
            <header class="ai-quality-page__panel-head"><div><h2>结果分布</h2><p>回答结果构成</p></div></header>
            <div class="ai-quality-page__donut-wrap">
              <div ref="resultChartEl" class="ai-quality-page__result-chart" />
              <div class="ai-quality-page__donut-total"><strong>{{ formatCount(resultTotal) }}</strong><span>总样本</span></div>
            </div>
          </section>

          <section class="page-panel ai-quality-page__reason-panel">
            <header class="ai-quality-page__panel-head">
              <div><h2>负反馈原因</h2><p>定位回答质量短板</p></div>
              <span class="is-danger">共 {{ overview?.summary.downFeedbackCount ?? 0 }} 条</span>
            </header>
            <EmptyState v-if="!overview?.feedbackReasons.length" message="当前范围暂无负反馈" />
            <div v-else class="ai-quality-page__reason-list">
              <div v-for="item in overview.feedbackReasons" :key="item.name" class="ai-quality-page__reason-row">
                <span><i />{{ reasonLabel(item.name) }}</span>
                <div><i :style="{ width: `${item.value * 100 / maxReasonValue}%` }" /></div>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section class="page-panel ai-quality-page__samples">
        <header class="ai-quality-page__samples-header">
          <div class="ai-quality-page__samples-title">
            <span><Warning /></span>
            <div><h2>低质量样本</h2><p>聚焦拒答、调用失败和被点踩的回答，展开行可查看完整问答。</p></div>
          </div>
          <strong>{{ formatCount(samples.total) }} 条</strong>
        </header>
        <div class="ai-quality-page__filter-bar">
          <div class="ai-quality-page__filters">
            <el-input v-model="keyword" clearable :prefix-icon="Search" placeholder="搜索问题或回答" @keyup.enter="searchSamples" />
            <el-select v-model="result" clearable placeholder="结果类型">
              <el-option v-for="item in resultOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-select v-model="reasonCode" clearable placeholder="反馈原因">
              <el-option v-for="item in reasonOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-button type="primary" @click="searchSamples">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </div>
        </div>

        <div v-loading="sampleLoading" class="ai-quality-page__sample-table">
          <EmptyState v-if="!samples.records.length && !sampleLoading" message="当前范围没有低质量样本" />
          <template v-else>
            <el-table :data="samples.records" row-key="callId">
              <el-table-column type="expand">
                <template #default="{ row }: { row: AiQualitySampleVO }">
                  <div class="ai-quality-page__sample-detail">
                    <div class="is-question"><span><ChatDotRound /> 用户问题</span><p>{{ row.question || '未记录问题内容' }}</p></div>
                    <div class="is-answer"><span><DocumentChecked /> AI 回答</span><p>{{ row.answer || '本次调用未生成完整回答' }}</p></div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="时间" min-width="150">
                <template #default="{ row }: { row: AiQualitySampleVO }">{{ formatDateTime(row.createTime) }}</template>
              </el-table-column>
              <el-table-column label="问题" min-width="220" prop="question" show-overflow-tooltip />
              <el-table-column label="结果" width="110">
                <template #default="{ row }: { row: AiQualitySampleVO }">
                  <el-tag :type="resultType(row.result)" effect="light">{{ resultLabel(row.result) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="问题原因" min-width="150">
                <template #default="{ row }: { row: AiQualitySampleVO }">{{ issueLabel(row) }}</template>
              </el-table-column>
              <el-table-column label="耗时" width="100">
                <template #default="{ row }: { row: AiQualitySampleVO }">{{ formatDuration(row.durationMs) }}</template>
              </el-table-column>
              <el-table-column label="引用" width="80" prop="referenceCount" />
              <el-table-column label="调用用户" width="110" prop="operatorId" />
            </el-table>
            <PaginationBar
              :page="samples.page"
              :size="samples.size"
              :total="samples.total"
              @update:page="handlePageChange"
              @update:size="handleSizeChange"
            />
          </template>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.ai-quality-page {
  gap: 18px;
}

.ai-quality-page__hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  overflow: hidden;
  min-height: 164px;
  border: 1px solid #d7e1ee;
  border-radius: 12px;
  background:
    radial-gradient(circle at 84% 18%, rgb(77 137 220 / 16%), transparent 28%),
    linear-gradient(135deg, #fff 0%, #f6f9fe 58%, #edf4ff 100%);
  box-shadow: 0 10px 30px rgb(23 56 98 / 7%);
  padding: 25px 28px;
}

.ai-quality-page__hero::after {
  position: absolute;
  top: -56px;
  right: 7%;
  width: 160px;
  height: 160px;
  border: 1px solid rgb(18 82 173 / 10%);
  border-radius: 50%;
  box-shadow: 0 0 0 28px rgb(18 82 173 / 3%), 0 0 0 58px rgb(18 82 173 / 2%);
  content: '';
  pointer-events: none;
}

.ai-quality-page__hero-copy,
.ai-quality-page__hero-actions {
  position: relative;
  z-index: 1;
}

.ai-quality-page__eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 9px;
  color: #1252ad;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
}

.ai-quality-page__eyebrow svg { width: 15px; }
.ai-quality-page__hero h1 { margin: 0; color: #0f1d31; font-size: 27px; font-weight: 700; letter-spacing: -.02em; }
.ai-quality-page__hero p { margin: 8px 0 0; color: #64748b; font-size: 13px; }

.ai-quality-page__scope {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 19px;
}

.ai-quality-page__scope span { display: flex; align-items: center; gap: 6px; color: #526176; font-size: 11px; }
.ai-quality-page__scope i { width: 6px; height: 6px; border-radius: 50%; background: #1252ad; box-shadow: 0 0 0 3px rgb(18 82 173 / 10%); }
.ai-quality-page__scope i.is-green { background: #148c59; box-shadow: 0 0 0 3px rgb(20 140 89 / 10%); }
.ai-quality-page__scope i.is-amber { background: #e49216; box-shadow: 0 0 0 3px rgb(228 146 22 / 10%); }

.ai-quality-page__hero-actions {
  display: grid;
  grid-template-columns: auto auto;
  gap: 8px;
  align-items: center;
  flex: 0 0 auto;
  border: 1px solid rgb(211 222 236 / 85%);
  border-radius: 10px;
  background: rgb(255 255 255 / 82%);
  box-shadow: 0 8px 22px rgb(31 65 108 / 6%);
  padding: 12px;
  backdrop-filter: blur(8px);
}

.ai-quality-page__hero-actions > span { grid-column: 1 / -1; color: #68778c; font-size: 11px; font-weight: 600; }
.ai-quality-page__hero-actions :deep(.el-date-editor) { width: 260px; }

.ai-quality-page__overview {
  display: grid;
  gap: 18px;
  min-height: 430px;
}

.ai-quality-page__metrics {
  display: grid;
  grid-template-columns: repeat(6, minmax(145px, 1fr));
  gap: 12px;
}

.ai-quality-page__metric {
  position: relative;
  display: grid;
  gap: 9px;
  min-height: 124px;
  overflow: hidden;
  border: 1px solid var(--ops-border-color);
  border-radius: 10px;
  background: var(--ops-bg-panel);
  box-shadow: var(--ops-shadow-panel);
  padding: 16px 17px 14px;
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}

.ai-quality-page__metric:hover { border-color: #bdcee3; box-shadow: 0 12px 26px rgb(15 54 99 / 9%); transform: translateY(-2px); }

.ai-quality-page__metric::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--ops-primary-color);
  content: '';
}

.ai-quality-page__metric.is-success::before { background: #148c59; }
.ai-quality-page__metric.is-warning::before { background: #f29e1f; }
.ai-quality-page__metric.is-teal::before { background: #05788a; }
.ai-quality-page__metric.is-violet::before { background: #7659c5; }
.ai-quality-page__metric.is-slate::before { background: #64748b; }

.ai-quality-page__metric-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ai-quality-page__metric-head > i { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 8px; background: #eef5ff; color: #1252ad; }
.ai-quality-page__metric-head > i svg { width: 16px; height: 16px; }
.ai-quality-page__metric.is-success .ai-quality-page__metric-head > i { background: #eaf8f1; color: #148c59; }
.ai-quality-page__metric.is-warning .ai-quality-page__metric-head > i { background: #fff5e5; color: #d98a14; }
.ai-quality-page__metric.is-teal .ai-quality-page__metric-head > i { background: #e8f7f8; color: #05788a; }
.ai-quality-page__metric.is-violet .ai-quality-page__metric-head > i { background: #f1edfb; color: #7659c5; }
.ai-quality-page__metric.is-slate .ai-quality-page__metric-head > i { background: #f0f3f6; color: #64748b; }

.ai-quality-page__metric span,
.ai-quality-page__metric small {
  color: var(--ops-text-secondary);
  font-size: 12px;
}

.ai-quality-page__metric strong {
  color: var(--ops-text-primary);
  font-size: 25px;
  line-height: 1.1;
}

.ai-quality-page__metric small { display: flex; align-items: center; gap: 6px; }
.ai-quality-page__metric small b { width: 5px; height: 5px; border-radius: 50%; background: #a7b3c3; }

.ai-quality-page__chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(250px, .72fr) minmax(270px, .8fr);
  gap: 12px;
}

.ai-quality-page__chart-grid .page-panel,
.ai-quality-page__samples {
  border-radius: 10px;
  padding: 19px;
}

.ai-quality-page__panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.ai-quality-page__panel-head > span { border-radius: 999px; background: #f1f5fa; padding: 5px 9px; color: #6b788a; font-size: 10px; white-space: nowrap; }
.ai-quality-page__panel-head > span.is-danger { background: #fff0f0; color: #b93636; }
.ai-quality-page__panel-head :deep(.el-radio-button__inner) { min-width: 48px; padding: 6px 11px; font-size: 11px; }

.ai-quality-page header h2 {
  margin: 0;
  color: var(--ops-text-primary);
  font-size: 17px;
}

.ai-quality-page header p {
  margin: 5px 0 0;
  color: var(--ops-text-secondary);
  font-size: 12px;
}

.ai-quality-page__trend-chart,
.ai-quality-page__result-chart {
  height: 258px;
  margin-top: 10px;
}

.ai-quality-page__donut-wrap { position: relative; }
.ai-quality-page__donut-total { position: absolute; top: 98px; left: 50%; display: grid; pointer-events: none; text-align: center; transform: translate(-50%, -50%); }
.ai-quality-page__donut-total strong { color: #142033; font-size: 21px; line-height: 1.2; }
.ai-quality-page__donut-total span { margin-top: 3px; color: #8793a3; font-size: 10px; }

.ai-quality-page__reason-list {
  display: grid;
  gap: 18px;
  padding-top: 28px;
}

.ai-quality-page__reason-row {
  display: grid;
  grid-template-columns: 88px minmax(80px, 1fr) 28px;
  gap: 10px;
  align-items: center;
  font-size: 12px;
}

.ai-quality-page__reason-row span { display: flex; align-items: center; gap: 7px; color: var(--ops-text-secondary); }
.ai-quality-page__reason-row span i { width: 6px; height: 6px; flex: 0 0 auto; border-radius: 2px; background: #d44949; }
.ai-quality-page__reason-row > div { height: 10px; overflow: hidden; border-radius: 5px; background: #edf1f5; }
.ai-quality-page__reason-row > div i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #ef7777, #d44949); }
.ai-quality-page__reason-row strong { color: #344256; text-align: right; }

.ai-quality-page__samples-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 15px;
}

.ai-quality-page__samples-header > strong { border-radius: 999px; background: #fff0f0; padding: 6px 10px; color: #b93636; font-size: 11px; }
.ai-quality-page__samples-title { display: flex; align-items: flex-start; gap: 11px; }
.ai-quality-page__samples-title > span { display: grid; width: 34px; height: 34px; flex: 0 0 auto; place-items: center; border-radius: 9px; background: #fff4e5; color: #d88a14; }
.ai-quality-page__samples-title > span svg { width: 17px; }

.ai-quality-page__filter-bar { margin: 0 -19px 14px; border-top: 1px solid #e6ebf2; border-bottom: 1px solid #e6ebf2; background: #f8fafc; padding: 11px 19px; }

.ai-quality-page__filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px;
}

.ai-quality-page__filters .el-input { width: 220px; }
.ai-quality-page__filters .el-select { width: 140px; }
.ai-quality-page__sample-table { min-height: 260px; }
.ai-quality-page__sample-table :deep(.el-table) { --el-table-header-bg-color: #f6f8fb; --el-table-row-hover-bg-color: #f4f8fd; color: #354256; }
.ai-quality-page__sample-table :deep(.el-table th.el-table__cell) { height: 42px; color: #647286; font-size: 12px; font-weight: 600; }
.ai-quality-page__sample-table :deep(.el-table td.el-table__cell) { height: 50px; border-bottom-color: #edf0f4; font-size: 12px; }

.ai-quality-page__sample-detail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  padding: 8px 48px 18px;
}

.ai-quality-page__sample-detail > div {
  position: relative;
  border: 1px solid #dfe7f0;
  border-radius: 9px;
  background: #f8fafc;
  padding: 15px 16px;
}

.ai-quality-page__sample-detail > div.is-question { border-left: 3px solid #1252ad; }
.ai-quality-page__sample-detail > div.is-answer { border-left: 3px solid #148c59; background: #f7fbf9; }

.ai-quality-page__sample-detail span { display: flex; align-items: center; gap: 6px; color: var(--ops-text-secondary); font-size: 12px; font-weight: 600; }
.ai-quality-page__sample-detail span svg { width: 14px; }
.ai-quality-page__sample-detail p { margin: 8px 0 0; color: var(--ops-text-primary); font-size: 13px; line-height: 1.65; white-space: pre-wrap; }

@media (max-width: 1500px) {
  .ai-quality-page__metrics { grid-template-columns: repeat(3, minmax(160px, 1fr)); }
}

@media (max-width: 1280px) {
  .ai-quality-page__chart-grid { grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr); }
  .ai-quality-page__reason-panel { grid-column: 1 / -1; }
  .ai-quality-page__hero { align-items: flex-start; }
}

@media (max-width: 960px) {
  .ai-quality-page__metrics,
  .ai-quality-page__chart-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ai-quality-page__hero { flex-direction: column; }
  .ai-quality-page__hero-actions { width: 100%; box-sizing: border-box; }
  .ai-quality-page__hero-actions :deep(.el-date-editor) { width: 100%; }
  .ai-quality-page__samples-header { flex-direction: column; }
  .ai-quality-page__filters { justify-content: flex-start; }
}

@media (max-width: 680px) {
  .ai-quality-page__metrics,
  .ai-quality-page__chart-grid,
  .ai-quality-page__sample-detail { grid-template-columns: 1fr; }
  .ai-quality-page__hero { padding: 20px; }
  .ai-quality-page__hero-actions { grid-template-columns: 1fr; }
  .ai-quality-page__hero-actions > span { grid-column: auto; }
  .ai-quality-page__scope { display: grid; gap: 10px; }
  .ai-quality-page__filters .el-input,
  .ai-quality-page__filters .el-select { width: 100%; }
}
</style>
