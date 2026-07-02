<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Check, Refresh, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import {
  markAllNotificationsRead,
  markNotificationRead,
  searchNotifications,
} from '@/api/modules/notifications'
import PageHeader from '@/components/common/PageHeader.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { useNotificationStore } from '@/stores/modules/notification'
import { formatDateTime } from '@/utils/format-date'
import { notificationTypeLabel, resolveNotificationRoute } from '@/utils/notification-view'
import type { NotificationType, NotificationVO } from '@/types/notification'

const NOTIFICATION_TYPE_OPTIONS: { label: string; value: NotificationType }[] = [
  { label: '工单分派', value: 'TICKET_ASSIGNED' },
  { label: '工单评论', value: 'TICKET_COMMENTED' },
  { label: '状态变更', value: 'TICKET_STATUS_CHANGED' },
  { label: '超时提醒', value: 'TICKET_OVERDUE' },
  { label: '关闭通知', value: 'TICKET_CLOSED' },
]

const router = useRouter()
const notificationStore = useNotificationStore()
const loading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const records = ref<NotificationVO[]>([])
const page = ref(1)
const size = ref(10)
const total = ref(0)

const filters = reactive({
  read: 'all' as 'all' | 'unread' | 'read',
  type: undefined as NotificationType | undefined,
})

const unreadHint = computed(() => `${notificationStore.unreadCount} 条未读`)

async function loadNotifications() {
  loading.value = true
  error.value = ''
  try {
    const result = await searchNotifications({
      page: page.value,
      size: size.value,
      type: filters.type,
      read: filters.read === 'all' ? undefined : filters.read === 'read',
    })
    records.value = result.records
    page.value = result.page
    size.value = result.size
    total.value = result.total
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '通知列表加载失败'
  } finally {
    loading.value = false
  }
}

async function refreshPage() {
  await Promise.allSettled([loadNotifications(), notificationStore.refreshUnreadCount()])
}

async function markOneRead(notification: NotificationVO) {
  if (!notification.read) {
    const updated = await markNotificationRead(notification.id)
    const index = records.value.findIndex((item) => item.id === notification.id)
    if (index >= 0) {
      records.value[index] = updated
    }
    await notificationStore.refreshUnreadCount()
  }
}

async function viewNotification(notification: NotificationVO) {
  await markOneRead(notification)
  const route = resolveNotificationRoute(notification)
  if (route) {
    await router.push(route)
    return
  }
  ElMessage.info('该通知暂未配置详情跳转')
}

async function markAllRead() {
  actionLoading.value = true
  try {
    const result = await markAllNotificationsRead(filters.type)
    ElMessage.success(`已标记 ${result.updatedCount} 条通知为已读`)
    await refreshPage()
  } finally {
    actionLoading.value = false
  }
}

function handleFilterChange() {
  page.value = 1
  void loadNotifications()
}

function updatePage(value: number) {
  page.value = value
  void loadNotifications()
}

function updateSize(value: number) {
  page.value = 1
  size.value = value
  void loadNotifications()
}

onMounted(refreshPage)
</script>

<template>
  <!-- 通知中心只展示当前登录用户通知，未读计数由 notification store 承接。 -->
  <section class="page-stack notification-center">
    <PageHeader
      title="通知中心"
      description="工单分派、评论、状态变更、超时提醒和关闭通知"
    >
      <template #actions>
        <el-tag type="danger" effect="light">{{ unreadHint }}</el-tag>
        <el-button :icon="Refresh" @click="refreshPage">刷新</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" @retry="refreshPage" />

    <template v-else>
      <section class="page-panel notification-center__ops">
        <el-segmented
          v-model="filters.read"
          :options="[
            { label: '全部', value: 'all' },
            { label: '只看未读', value: 'unread' },
            { label: '只看已读', value: 'read' },
          ]"
          @change="handleFilterChange"
        />
        <el-select
          v-model="filters.type"
          clearable
          placeholder="通知类型"
          class="notification-center__type"
          @change="handleFilterChange"
          @clear="handleFilterChange"
        >
          <el-option
            v-for="item in NOTIFICATION_TYPE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-button :icon="Check" :loading="actionLoading" @click="markAllRead">全部已读</el-button>
        <span>未读 {{ notificationStore.unreadCount }} 条，通知可跳转到已落地业务详情。</span>
      </section>

      <section v-loading="loading" class="page-panel notification-center__table">
        <EmptyState v-if="!records.length" message="暂无通知" />
        <el-table v-else :data="records" row-key="id">
          <el-table-column label="状态" width="110">
            <template #default="{ row }: { row: NotificationVO }">
              <el-tag :type="row.read ? 'info' : 'primary'" effect="light">
                {{ row.read ? '已读' : '未读' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="150">
            <template #default="{ row }: { row: NotificationVO }">
              {{ notificationTypeLabel(row.type) }}
            </template>
          </el-table-column>
          <el-table-column label="内容" min-width="320">
            <template #default="{ row }: { row: NotificationVO }">
              <div class="notification-center__content">
                <strong>{{ row.title }}</strong>
                <span>{{ row.content }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="时间" width="180">
            <template #default="{ row }: { row: NotificationVO }">
              {{ formatDateTime(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }: { row: NotificationVO }">
              <el-button :icon="View" text type="primary" @click="viewNotification(row)">查看</el-button>
              <el-button v-if="!row.read" text @click="markOneRead(row)">标记已读</el-button>
            </template>
          </el-table-column>
        </el-table>
        <PaginationBar
          :page="page"
          :size="size"
          :total="total"
          @update:page="updatePage"
          @update:size="updateSize"
        />
      </section>
    </template>
  </section>
</template>

<style scoped>
.notification-center__ops {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
}

.notification-center__ops span {
  color: var(--ops-text-secondary);
  font-size: 13px;
}

.notification-center__type {
  width: 180px;
}

.notification-center__table {
  padding: 18px;
}

.notification-center__content {
  display: grid;
  gap: 4px;
}

.notification-center__content strong {
  font-size: 14px;
}

.notification-center__content span {
  color: var(--ops-text-secondary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

@media (max-width: 820px) {
  .notification-center__ops {
    align-items: stretch;
    flex-direction: column;
  }

  .notification-center__type {
    width: 100%;
  }
}
</style>
