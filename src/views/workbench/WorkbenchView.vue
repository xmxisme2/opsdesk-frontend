<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CirclePlus, Refresh, Search, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { getWorkbenchSummary } from '@/api/modules/dashboard'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import PriorityTag from '@/components/business/PriorityTag.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import { formatDateTime } from '@/utils/format-date'
import { notificationTypeLabel, resolveNotificationRoute } from '@/utils/notification-view'
import { buildWorkbenchMetrics, buildWorkbenchQuickActions } from '@/utils/workbench-view'
import type { WorkbenchSummary } from '@/types/dashboard'
import type { NotificationVO } from '@/types/notification'
import type { TicketListItemVO } from '@/types/ticket'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const summary = ref<WorkbenchSummary | null>(null)

const metrics = computed(() => (summary.value ? buildWorkbenchMetrics(summary.value) : []))
const quickActions = buildWorkbenchQuickActions()
const unreadText = computed(() => `${summary.value?.unreadNotificationCount ?? 0} 未读`)

async function loadSummary() {
  loading.value = true
  error.value = ''
  try {
    summary.value = await getWorkbenchSummary()
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '工作台摘要加载失败'
  } finally {
    loading.value = false
  }
}

function searchTickets() {
  const text = keyword.value.trim()
  if (!text) {
    router.push('/tickets')
    return
  }
  router.push({ path: '/tickets', query: { keyword: text } })
}

function openTicket(ticket: TicketListItemVO) {
  router.push(`/tickets/${ticket.id}`)
}

function runQuickAction(path?: string, disabled?: boolean) {
  if (disabled || !path) {
    ElMessage.info('该能力将在后续版本开放')
    return
  }
  router.push(path)
}

function viewNotification(notification: NotificationVO) {
  const route = resolveNotificationRoute(notification)
  if (route) {
    router.push(route)
    return
  }
  ElMessage.info('该通知暂未配置详情跳转')
}

onMounted(loadSummary)
</script>

<template>
  <!-- 工作台按当前用户展示摘要数据，后端负责资源范围收敛。 -->
  <section class="page-stack workbench-page">
    <PageHeader title="团队工作台" description="按角色展示待办、我创建、我处理、通知和快捷入口">
      <template #actions>
        <el-input
          v-model="keyword"
          class="workbench-page__search"
          clearable
          :prefix-icon="Search"
          placeholder="搜索编号、标题、提交人"
          @keyup.enter="searchTickets"
        />
        <el-tag type="danger" effect="light">{{ unreadText }}</el-tag>
        <el-button :icon="Refresh" @click="loadSummary">刷新</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" @retry="loadSummary" />

    <section v-else v-loading="loading" class="workbench-page__content">
      <div class="workbench-page__metrics">
        <article
          v-for="item in metrics"
          :key="item.key"
          class="workbench-page__metric"
          :class="`workbench-page__metric--${item.tone}`"
        >
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.helper }}</small>
        </article>
      </div>

      <div class="workbench-page__main-grid">
        <section class="page-panel workbench-page__tickets">
          <header class="workbench-page__panel-header">
            <h2>近期工单</h2>
            <el-button text type="primary" :icon="View" @click="router.push('/tickets')">查看全部</el-button>
          </header>
          <EmptyState v-if="!summary?.latestTickets.length" message="暂无可查看工单" />
          <el-table v-else :data="summary.latestTickets" row-key="id">
            <el-table-column label="编号" min-width="150">
              <template #default="{ row }: { row: TicketListItemVO }">
                <el-button text type="primary" @click="openTicket(row)">{{ row.ticketNo || row.id }}</el-button>
              </template>
            </el-table-column>
            <el-table-column label="标题" min-width="180" show-overflow-tooltip prop="title" />
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
            <el-table-column label="操作" width="100">
              <template #default="{ row }: { row: TicketListItemVO }">
                <el-button text type="primary" @click="openTicket(row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <aside class="page-panel workbench-page__quick">
          <h2>快捷入口</h2>
          <button
            v-for="item in quickActions"
            :key="item.key"
            class="workbench-page__quick-item"
            :class="{ 'is-disabled': item.disabled }"
            type="button"
            @click="runQuickAction(item.path, item.disabled)"
          >
            <CirclePlus v-if="item.key === 'createTicket'" />
            <span>{{ item.label }}</span>
          </button>
        </aside>
      </div>

      <section class="page-panel workbench-page__notifications">
        <header class="workbench-page__panel-header">
          <h2>最近通知</h2>
          <el-button text type="primary" @click="router.push('/notifications')">通知中心</el-button>
        </header>
        <EmptyState v-if="!summary?.latestNotifications.length" message="暂无通知" />
        <div v-else class="workbench-page__notice-list">
          <button
            v-for="item in summary.latestNotifications"
            :key="item.id"
            class="workbench-page__notice"
            type="button"
            @click="viewNotification(item)"
          >
            <el-tag :type="item.read ? 'info' : 'primary'" effect="light">{{ notificationTypeLabel(item.type) }}</el-tag>
            <strong>{{ item.title }}</strong>
            <span>{{ item.content }}</span>
            <time>{{ formatDateTime(item.createdAt) }}</time>
          </button>
        </div>
      </section>
    </section>
  </section>
</template>

<style scoped>
.workbench-page__search {
  width: 260px;
}

.workbench-page__content {
  display: grid;
  gap: 16px;
  min-height: 520px;
}

.workbench-page__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 18px;
}

.workbench-page__metric {
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

.workbench-page__metric::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  content: '';
}

.workbench-page__metric--warning::before {
  background: #ba630f;
}

.workbench-page__metric--primary::before {
  background: var(--ops-primary-color);
}

.workbench-page__metric--success::before {
  background: #0d8052;
}

.workbench-page__metric--danger::before {
  background: var(--ops-danger-color);
}

.workbench-page__metric span,
.workbench-page__metric small {
  color: var(--ops-text-secondary);
  font-size: 13px;
}

.workbench-page__metric strong {
  color: var(--ops-text-primary);
  font-size: 28px;
  line-height: 1.15;
}

.workbench-page__main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

.workbench-page__tickets,
.workbench-page__quick,
.workbench-page__notifications {
  padding: 18px;
}

.workbench-page__panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.workbench-page__panel-header h2,
.workbench-page__quick h2 {
  margin: 0;
  color: var(--ops-text-primary);
  font-size: 18px;
}

.workbench-page__quick {
  display: grid;
  gap: 14px;
}

.workbench-page__quick-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--ops-border-color);
  border-radius: 6px;
  background: #f0f2f6;
  color: var(--ops-text-primary);
  cursor: pointer;
  font-weight: 600;
  padding: 0 16px;
  text-align: left;
}

.workbench-page__quick-item:first-of-type {
  background: #e3f0ff;
}

.workbench-page__quick-item.is-disabled {
  cursor: not-allowed;
  opacity: 0.64;
}

.workbench-page__quick-item svg {
  width: 16px;
  height: 16px;
}

.workbench-page__notice-list {
  display: grid;
  gap: 10px;
}

.workbench-page__notice {
  display: grid;
  grid-template-columns: 110px minmax(120px, 180px) minmax(0, 1fr) 170px;
  gap: 12px;
  align-items: center;
  width: 100%;
  border: 1px solid var(--ops-border-color);
  border-radius: 6px;
  background: #fff;
  color: var(--ops-text-primary);
  cursor: pointer;
  padding: 12px;
  text-align: left;
}

.workbench-page__notice strong,
.workbench-page__notice span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workbench-page__notice span,
.workbench-page__notice time {
  color: var(--ops-text-secondary);
  font-size: 13px;
}

@media (max-width: 1180px) {
  .workbench-page__metrics {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }

  .workbench-page__main-grid,
  .workbench-page__notice {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .workbench-page__search {
    width: 100%;
  }

  .workbench-page__metrics {
    grid-template-columns: 1fr;
  }
}
</style>
