<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { CirclePlus, Delete, Edit, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { createSlaRule, deleteSlaRule, searchSlaRules, updateSlaRule } from '@/api/modules/system'
import { getTicketCategoryTree } from '@/api/modules/tickets'
import DataTable from '@/components/common/DataTable.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import type { ApiId } from '@/types/api'
import type { SlaRuleMutationRequest, SlaRuleVO } from '@/types/system'
import type { TicketCategoryVO, TicketPriority } from '@/types/ticket'

type CategoryOption = { label: string; value: ApiId; children?: CategoryOption[] }
type SlaForm = SlaRuleMutationRequest & { id?: ApiId }

const loading = ref(false)
const errorMessage = ref('')
const saving = ref(false)
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const rules = ref<SlaRuleVO[]>([])
const categories = ref<TicketCategoryVO[]>([])
const filter = reactive<{ categoryId?: ApiId; priority?: TicketPriority; enabled?: boolean }>({})
const form = reactive<SlaForm>({ categoryId: '', priority: 'MEDIUM', responseHours: 4, resolveHours: 24, enabled: true })

const priorityOptions: { label: string; value: TicketPriority }[] = [
  { label: '低', value: 'LOW' }, { label: '中', value: 'MEDIUM' }, { label: '高', value: 'HIGH' }, { label: '紧急', value: 'URGENT' },
]
const categoryOptions = computed(() => buildCategoryOptions(categories.value))
const formRules: FormRules<SlaForm> = {
  categoryId: [{ required: true, message: '请选择适用分类', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  responseHours: [{ required: true, message: '请输入响应时限', trigger: 'blur' }],
  resolveHours: [{ required: true, message: '请输入解决时限', trigger: 'blur' }],
}

// SLA 页面只维护新工单使用的规则，后端不会追溯重算历史工单截止时间。
async function loadRules() {
  loading.value = true
  errorMessage.value = ''
  try {
    rules.value = await searchSlaRules(filter)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'SLA 规则加载失败'
  } finally { loading.value = false }
}

async function loadCategories() { categories.value = await getTicketCategoryTree({ enabled: true }) }
function buildCategoryOptions(items: TicketCategoryVO[]): CategoryOption[] { return items.map(item => ({ label: item.name, value: item.id, children: item.children?.length ? buildCategoryOptions(item.children) : undefined })) }
function categoryName(id: ApiId) { const find = (items: TicketCategoryVO[]): string | undefined => { for (const item of items) { if (item.id === id) return item.name; const child = item.children ? find(item.children) : undefined; if (child) return child } }; return find(categories.value) || id }
function priorityName(priority: TicketPriority) { return priorityOptions.find(item => item.value === priority)?.label || priority }

function openCreate() { Object.assign(form, { id: undefined, categoryId: '', priority: 'MEDIUM', responseHours: 4, resolveHours: 24, enabled: true }); dialogVisible.value = true; nextTick(() => formRef.value?.clearValidate()) }
function openEdit(row: SlaRuleVO) { Object.assign(form, row); dialogVisible.value = true; nextTick(() => formRef.value?.clearValidate()) }

async function saveRule() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (form.resolveHours < form.responseHours) { ElMessage.warning('解决时限不能小于响应时限'); return }
  saving.value = true
  try {
    const payload: SlaRuleMutationRequest = { categoryId: form.categoryId, priority: form.priority, responseHours: form.responseHours, resolveHours: form.resolveHours, enabled: form.enabled }
    if (form.id) await updateSlaRule(form.id, payload); else await createSlaRule(payload)
    ElMessage.success(form.id ? 'SLA 规则已更新' : 'SLA 规则已创建')
    dialogVisible.value = false
    await loadRules()
  } finally { saving.value = false }
}

async function disableRule(row: SlaRuleVO) {
  await ElMessageBox.confirm(`确认禁用“${categoryName(row.categoryId)} / ${priorityName(row.priority)}”规则？`, '禁用 SLA 规则', { confirmButtonText: '禁用', cancelButtonText: '取消', type: 'warning' })
  await deleteSlaRule(row.id); ElMessage.success('SLA 规则已禁用'); await loadRules()
}

function resetFilter() { filter.categoryId = undefined; filter.priority = undefined; filter.enabled = undefined; loadRules() }
onMounted(() => Promise.allSettled([loadCategories(), loadRules()]))
</script>

<template>
  <!-- 对齐 Figma 64:1049 的系统配置内容区，SLA 规则采用列表维护以覆盖多分类和优先级组合。 -->
  <section class="page-stack sla-page">
    <PageHeader title="SLA 规则配置" description="维护分类与优先级对应的响应、解决时限；配置只影响后续工单">
      <template #actions><el-button :icon="Refresh" @click="loadRules">刷新</el-button><el-button type="primary" :icon="CirclePlus" @click="openCreate">新增规则</el-button></template>
    </PageHeader>
    <section class="page-panel sla-filters">
      <el-select v-model="filter.categoryId" clearable placeholder="全部分类" @change="loadRules"><el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
      <el-select v-model="filter.priority" clearable placeholder="全部优先级" @change="loadRules"><el-option v-for="item in priorityOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
      <el-select v-model="filter.enabled" clearable placeholder="全部状态" @change="loadRules"><el-option label="启用" :value="true" /><el-option label="禁用" :value="false" /></el-select>
      <el-button @click="resetFilter">重置</el-button>
    </section>
    <DataTable :loading="loading" :error="errorMessage" :empty="rules.length === 0" @retry="loadRules">
      <el-table :data="rules" row-key="id">
        <el-table-column label="适用分类" min-width="180"><template #default="{ row }: { row: SlaRuleVO }">{{ categoryName(row.categoryId) }}</template></el-table-column>
        <el-table-column label="优先级" width="110"><template #default="{ row }: { row: SlaRuleVO }"><el-tag>{{ priorityName(row.priority) }}</el-tag></template></el-table-column>
        <el-table-column label="响应时限" min-width="130"><template #default="{ row }: { row: SlaRuleVO }">{{ row.responseHours }} 小时</template></el-table-column>
        <el-table-column label="解决时限" min-width="130"><template #default="{ row }: { row: SlaRuleVO }">{{ row.resolveHours }} 小时</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }: { row: SlaRuleVO }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '禁用' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }: { row: SlaRuleVO }"><el-button :icon="Edit" text type="primary" @click="openEdit(row)" /><el-button :icon="Delete" text type="danger" :disabled="!row.enabled" @click="disableRule(row)" /></template></el-table-column>
      </el-table>
    </DataTable>
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑 SLA 规则' : '新增 SLA 规则'" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-position="top">
        <div class="sla-form-grid">
          <el-form-item label="适用分类" prop="categoryId"><el-tree-select v-model="form.categoryId" :data="categoryOptions" check-strictly filterable node-key="value" placeholder="请选择分类" /></el-form-item>
          <el-form-item label="优先级" prop="priority"><el-select v-model="form.priority"><el-option v-for="item in priorityOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
          <el-form-item label="响应时限（小时）" prop="responseHours"><el-input-number v-model="form.responseHours" :min="1" :max="8760" /></el-form-item>
          <el-form-item label="解决时限（小时）" prop="resolveHours"><el-input-number v-model="form.resolveHours" :min="1" :max="8760" /></el-form-item>
        </div>
        <el-form-item label="启用状态"><el-switch v-model="form.enabled" inline-prompt active-text="启用" inactive-text="禁用" /></el-form-item>
        <el-alert title="配置变更会记录审计日志；不会追溯重算既有工单。" type="info" :closable="false" show-icon />
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="saveRule">保存配置</el-button></template>
    </el-dialog>
  </section>
</template>

<style scoped>
.sla-page { min-width: 0; }
.sla-filters { display: grid; grid-template-columns: repeat(3, minmax(160px, 220px)) auto; gap: 12px; padding: 16px; }
.sla-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.sla-form-grid :deep(.el-select), .sla-form-grid :deep(.el-tree-select), .sla-form-grid :deep(.el-input-number) { width: 100%; }
@media (max-width: 760px) { .sla-filters, .sla-form-grid { grid-template-columns: 1fr; } }
</style>
