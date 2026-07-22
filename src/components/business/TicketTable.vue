<script setup lang="ts">
import { Edit, View } from '@element-plus/icons-vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import PriorityTag from '@/components/business/PriorityTag.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import { formatDateTime } from '@/utils/format-date'
import { formatTicketDueState } from '@/utils/ticket-view'
import type { TicketListItemVO } from '@/types/ticket'

defineProps<{
  records: TicketListItemVO[]
  loading?: boolean
  error?: string
  page: number
  size: number
  total: number
  showCreator?: boolean
  allowDraftEdit?: boolean
}>()

defineEmits<{
  retry: []
  detail: [ticket: TicketListItemVO]
  edit: [ticket: TicketListItemVO]
  'update:page': [value: number]
  'update:size': [value: number]
}>()
</script>

<template>
  <!-- 工单表格统一承载列表态和分页，页面只负责查询条件与路由动作。 -->
  <DataTable :loading="loading" :error="error" :empty="!records.length" @retry="$emit('retry')">
    <div class="ticket-table__scroll">
      <el-table :data="records" row-key="id" class="ticket-table">
        <el-table-column label="编号" min-width="150">
          <template #default="{ row }">
            <!-- 编号为可选择文本，支持鼠标左键拖选复制；查看详情统一由操作列承接。 -->
            <span class="ticket-table__number">{{ row.ticketNo || '草稿' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="190" show-overflow-tooltip />
        <el-table-column label="分类" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.categoryName || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="优先级" width="96">
          <template #default="{ row }"><PriorityTag :priority="row.priority" /></template>
        </el-table-column>
        <el-table-column v-if="showCreator" label="提交人" min-width="110">
          <template #default="{ row }">{{ row.creatorName || '-' }}</template>
        </el-table-column>
        <el-table-column label="处理人" min-width="110">
          <template #default="{ row }">{{ row.assigneeName || '未分派' }}</template>
        </el-table-column>
        <el-table-column label="团队" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.teamName || '未分派' }}</template>
        </el-table-column>
        <el-table-column label="SLA" min-width="130">
          <template #default="{ row }">
            <span :class="`ticket-table__due--${formatTicketDueState(row.dueTime, row.overdue, row.status).tone}`">
              {{ formatTicketDueState(row.dueTime, row.overdue, row.status).label }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="150">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="104">
          <template #default="{ row }">
            <el-tooltip content="查看详情">
              <el-button :icon="View" circle text @click="$emit('detail', row)" />
            </el-tooltip>
            <el-tooltip v-if="allowDraftEdit && row.status === 'DRAFT'" content="编辑草稿">
              <el-button :icon="Edit" circle text @click="$emit('edit', row)" />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <PaginationBar
      :page="page"
      :size="size"
      :total="total"
      @update:page="$emit('update:page', $event)"
      @update:size="$emit('update:size', $event)"
    />
  </DataTable>
</template>

<style scoped>
.ticket-table__scroll {
  overflow-x: auto;
}

.ticket-table {
  min-width: 1080px;
}

/* 工单编号属于高频沟通信息，必须允许用户按住左键拖选并复制。 */
.ticket-table__number {
  color: var(--ops-primary-color);
  cursor: text;
  user-select: text;
}

.ticket-table__due--danger {
  color: var(--ops-danger-color);
  font-weight: 600;
}

.ticket-table__due--warning {
  color: #b26a00;
  font-weight: 600;
}

.ticket-table__due--normal {
  color: var(--ops-text-secondary);
}
</style>
