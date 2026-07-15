<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { CirclePlus, Delete, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElTree, type FormInstance, type FormRules } from 'element-plus'
import {
  createTicketCategory,
  deleteTicketCategory,
  getTicketCategoryTree,
  updateTicketCategory,
  type TicketCategoryMutationRequest,
} from '@/api/modules/tickets'
import { getPriorityOptions, updatePriorityOptions } from '@/api/modules/system'
import { searchTeams } from '@/api/modules/teams'
import { isRequestCanceled } from '@/api/http'
import PageHeader from '@/components/common/PageHeader.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { useDictionariesStore } from '@/stores/modules/dictionaries'
import type { ApiId } from '@/types/api'
import type { TeamVO } from '@/types/organization'
import type { PriorityOption } from '@/types/system'
import type { TicketCategoryVO } from '@/types/ticket'
import { excludeCategoryBranch } from '@/utils/ticket-category-tree'
import { createLatestRequestGuard } from '@/utils/latest-request'
import { normalizePriorityOptions, validatePriorityConfiguration } from '@/utils/priority-options'

type CategoryFormModel = TicketCategoryMutationRequest & { id?: ApiId }

const dictionariesStore = useDictionariesStore()
const categoryTreeRef = ref<InstanceType<typeof ElTree>>()
const categoryFormRef = ref<FormInstance>()
const priorityFormRef = ref<FormInstance>()
const categories = ref<TicketCategoryVO[]>([])
const teams = ref<TeamVO[]>([])
const selectedCategory = ref<TicketCategoryVO>()
const categoryKeyword = ref('')
const categoryLoading = ref(false)
const categorySaving = ref(false)
const categoryDeleting = ref(false)
const categoryError = ref('')
const teamLoading = ref(false)
const teamError = ref('')
const priorityLoading = ref(false)
const prioritySaving = ref(false)
const priorityError = ref('')
const categoryRequestGuard = createLatestRequestGuard()
const teamRequestGuard = createLatestRequestGuard()
const priorityRequestGuard = createLatestRequestGuard()

const categoryForm = reactive<CategoryFormModel>({
  id: undefined,
  name: '',
  parentId: undefined,
  defaultTeamId: undefined,
  defaultSlaHours: undefined,
  sort: 0,
  enabled: true,
})

const priorityForm = reactive<{ items: PriorityOption[] }>({ items: [] })

const categoryRules: FormRules<CategoryFormModel> = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  defaultSlaHours: [{ type: 'number', min: 1, message: '默认 SLA 必须为正整数小时', trigger: 'change' }],
  sort: [{ required: true, type: 'number', min: 0, message: '排序不能小于 0', trigger: 'change' }],
}

const parentCategoryTree = computed(() => excludeCategoryBranch(categories.value, categoryForm.id))
const currentTitle = computed(() => categoryForm.id ? categoryForm.name || '编辑分类' : '新增分类')
const categoryInteractionLocked = computed(() => categorySaving.value || categoryDeleting.value)

watch(categoryKeyword, (value) => categoryTreeRef.value?.filter(value.trim()))

function filterCategoryNode(value: string, data: Record<string, unknown>) {
  const name = typeof data.name === 'string' ? data.name : ''
  return !value || name.toLocaleLowerCase().includes(value.toLocaleLowerCase())
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function fillCategoryForm(category?: TicketCategoryVO, parentId?: ApiId) {
  selectedCategory.value = category
  Object.assign(categoryForm, {
    id: category?.id,
    name: category?.name ?? '',
    parentId: category?.parentId ?? parentId,
    defaultTeamId: category?.defaultTeamId,
    defaultSlaHours: category?.defaultSlaHours,
    sort: category?.sort ?? 0,
    enabled: category?.enabled ?? true,
  })
  nextTick(() => categoryFormRef.value?.clearValidate())
}

function selectCategory(category: TicketCategoryVO) {
  if (categoryInteractionLocked.value) {
    return
  }
  fillCategoryForm(category)
}

function addRootCategory() {
  if (categoryInteractionLocked.value) {
    return
  }
  categoryTreeRef.value?.setCurrentKey(undefined)
  fillCategoryForm()
}

function addChildCategory() {
  if (categoryInteractionLocked.value) {
    return
  }
  if (!selectedCategory.value?.id) {
    ElMessage.warning('请先选择父级分类')
    return
  }
  const parentId = selectedCategory.value.id
  categoryTreeRef.value?.setCurrentKey(undefined)
  fillCategoryForm(undefined, parentId)
}

// 分类树刷新后尽量保留当前选择，删除或首次加载时回落到第一项。
async function loadCategories(preferredId?: ApiId) {
  const requestVersion = categoryRequestGuard.begin()
  categoryLoading.value = true
  categoryError.value = ''
  try {
    const result = await getTicketCategoryTree({ enabled: undefined })
    if (!categoryRequestGuard.isLatest(requestVersion)) {
      return
    }
    categories.value = result
    const targetId = preferredId ?? selectedCategory.value?.id
    await nextTick()
    if (!categoryRequestGuard.isLatest(requestVersion)) {
      return
    }
    if (targetId) {
      categoryTreeRef.value?.setCurrentKey(targetId)
      const target = categoryTreeRef.value?.getNode(targetId)?.data as TicketCategoryVO | undefined
      if (target) {
        fillCategoryForm(target)
        return
      }
    }
    const first = categories.value[0]
    if (first) {
      categoryTreeRef.value?.setCurrentKey(first.id)
      fillCategoryForm(first)
    } else {
      fillCategoryForm()
    }
  } catch (error) {
    if (categoryRequestGuard.isLatest(requestVersion) && !isRequestCanceled(error)) {
      categoryError.value = errorText(error, '分类树加载失败')
    }
  } finally {
    if (categoryRequestGuard.isLatest(requestVersion)) {
      categoryLoading.value = false
    }
  }
}

async function loadTeams() {
  const requestVersion = teamRequestGuard.begin()
  teamLoading.value = true
  teamError.value = ''
  try {
    const result = await searchTeams({ page: 1, size: 100, enabled: true })
    if (teamRequestGuard.isLatest(requestVersion)) {
      teams.value = result.records
    }
  } catch (error) {
    if (teamRequestGuard.isLatest(requestVersion) && !isRequestCanceled(error)) {
      teamError.value = errorText(error, '启用团队加载失败')
    }
  } finally {
    if (teamRequestGuard.isLatest(requestVersion)) {
      teamLoading.value = false
    }
  }
}

async function loadPriorities() {
  const requestVersion = priorityRequestGuard.begin()
  priorityLoading.value = true
  priorityError.value = ''
  try {
    const items = normalizePriorityOptions(await getPriorityOptions())
    if (!priorityRequestGuard.isLatest(requestVersion)) {
      return
    }
    priorityForm.items.splice(0, priorityForm.items.length, ...items.map((item) => ({ ...item })))
    await nextTick()
    if (priorityRequestGuard.isLatest(requestVersion)) {
      priorityFormRef.value?.clearValidate()
    }
  } catch (error) {
    if (priorityRequestGuard.isLatest(requestVersion) && !isRequestCanceled(error)) {
      priorityError.value = errorText(error, '优先级配置加载失败')
    }
  } finally {
    if (priorityRequestGuard.isLatest(requestVersion)) {
      priorityLoading.value = false
    }
  }
}

async function saveCategory() {
  if (categoryInteractionLocked.value) {
    return
  }
  categorySaving.value = true
  try {
    const valid = await categoryFormRef.value?.validate().catch(() => false)
    if (!valid) {
      return
    }
    const submittedMode = categoryForm.id ? 'update' : 'create'
    const submittedId = categoryForm.id
    const payload: TicketCategoryMutationRequest = {
      name: categoryForm.name.trim(),
      parentId: categoryForm.parentId,
      defaultTeamId: categoryForm.defaultTeamId,
      defaultSlaHours: categoryForm.defaultSlaHours,
      sort: categoryForm.sort,
      enabled: categoryForm.enabled,
    }
    const saved = submittedMode === 'update' && submittedId
      ? await updateTicketCategory(submittedId, payload)
      : await createTicketCategory(payload)
    ElMessage.success(submittedMode === 'update' ? '分类已保存' : '分类已创建')
    await loadCategories(saved.id)
  } finally {
    categorySaving.value = false
  }
}

async function confirmDeleteCategory() {
  if (categoryInteractionLocked.value) {
    return
  }
  const category = selectedCategory.value
  if (!category?.id) {
    ElMessage.warning('请选择要删除的分类')
    return
  }
  try {
    await ElMessageBox.confirm(`确认删除分类“${category.name}”？存在子分类或关联工单时后端会阻止删除。`, '删除分类', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  categoryDeleting.value = true
  try {
    await deleteTicketCategory(category.id)
    ElMessage.success('分类已删除')
    selectedCategory.value = undefined
    await loadCategories()
  } finally {
    categoryDeleting.value = false
  }
}

async function savePriorities() {
  const formValid = await priorityFormRef.value?.validate().catch(() => false)
  const errors = validatePriorityConfiguration(priorityForm.items)
  if (!formValid || errors.length) {
    if (errors.length) {
      ElMessage.error(errors[0])
    }
    return
  }
  prioritySaving.value = true
  try {
    const payload = priorityForm.items.map((item) => ({
      ...item,
      name: item.name.trim(),
      color: item.color.toUpperCase(),
    }))
    const saved = normalizePriorityOptions(await updatePriorityOptions(payload))
    priorityForm.items.splice(0, priorityForm.items.length, ...saved.map((item) => ({ ...item })))
    await dictionariesStore.loadTicketPriorities(true)
    ElMessage.success('优先级配置已保存')
  } finally {
    prioritySaving.value = false
  }
}

function refreshAll() {
  return Promise.allSettled([loadCategories(), loadTeams(), loadPriorities()])
}

onMounted(refreshAll)
</script>

<template>
  <!-- 分类和优先级配置页遵循 Figma 65:206 的左右结构，分类与优先级拥有独立加载和保存状态。 -->
  <section class="page-stack category-config-page">
    <PageHeader title="工单分类与优先级配置" description="分类树、默认团队、默认 SLA、优先级枚举和启停">
      <template #actions>
        <el-button :icon="Refresh" :disabled="categoryInteractionLocked" @click="refreshAll">刷新</el-button>
      </template>
    </PageHeader>

    <section class="category-config-layout">
      <aside class="page-panel category-tree-panel">
        <header class="panel-heading">
          <h2>分类树</h2>
          <el-button text type="primary" :icon="CirclePlus" :disabled="categoryInteractionLocked" @click="addRootCategory">根分类</el-button>
        </header>
        <el-input v-model="categoryKeyword" clearable :prefix-icon="Search" :disabled="categoryInteractionLocked" placeholder="搜索分类" />

        <ErrorState v-if="categoryError" :message="categoryError" @retry="loadCategories()" />
        <el-tree
          v-else
          ref="categoryTreeRef"
          v-loading="categoryLoading"
          class="category-tree"
          :class="{ 'category-tree--locked': categoryInteractionLocked }"
          :data="categories"
          node-key="id"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          :filter-node-method="filterCategoryNode"
          :props="{ label: 'name', children: 'children' }"
          @node-click="selectCategory"
        >
          <template #default="{ data }: { data: TicketCategoryVO }">
            <div class="category-tree__node">
              <span>{{ data.name }}</span>
              <el-tag v-if="!data.enabled" size="small" type="info">停用</el-tag>
            </div>
          </template>
        </el-tree>

        <footer class="category-tree-panel__actions">
          <el-button type="primary" :icon="CirclePlus" :disabled="categoryInteractionLocked" @click="addRootCategory">新增根分类</el-button>
          <el-button :icon="CirclePlus" :disabled="categoryInteractionLocked || !selectedCategory" @click="addChildCategory">新增子分类</el-button>
          <el-button
            type="danger"
            :icon="Delete"
            :loading="categoryDeleting"
            :disabled="categoryInteractionLocked || !selectedCategory"
            @click="confirmDeleteCategory"
          >删除</el-button>
        </footer>
      </aside>

      <main class="page-panel category-form-panel">
        <section class="category-section">
          <header class="section-heading">
            <div>
              <h2>{{ currentTitle }}</h2>
              <p>分类默认值会在创建工单时提供分派建议。</p>
            </div>
            <el-button type="primary" :loading="categorySaving" @click="saveCategory">保存分类</el-button>
          </header>

          <el-form ref="categoryFormRef" :model="categoryForm" :rules="categoryRules" label-position="top">
            <div class="category-form-grid">
              <el-form-item label="分类名称" prop="name">
                <el-input v-model="categoryForm.name" maxlength="128" placeholder="请输入分类名称" />
              </el-form-item>
              <el-form-item label="父级分类" prop="parentId">
                <el-tree-select
                  v-model="categoryForm.parentId"
                  clearable
                  check-strictly
                  default-expand-all
                  node-key="id"
                  :data="parentCategoryTree"
                  :props="{ label: 'name', children: 'children', value: 'id' }"
                  placeholder="根分类"
                />
              </el-form-item>
              <el-form-item label="默认处理团队" prop="defaultTeamId">
                <el-select v-model="categoryForm.defaultTeamId" clearable filterable :loading="teamLoading" placeholder="可选">
                  <el-option v-for="team in teams" :key="team.id" :label="team.name" :value="team.id" />
                </el-select>
                <div v-if="teamError" class="field-error">
                  {{ teamError }}
                  <el-button link type="primary" @click="loadTeams">重试</el-button>
                </div>
              </el-form-item>
              <el-form-item label="默认 SLA（小时）" prop="defaultSlaHours">
                <el-input-number v-model="categoryForm.defaultSlaHours" :min="1" :max="8760" placeholder="可选" />
              </el-form-item>
              <el-form-item label="排序" prop="sort">
                <el-input-number v-model="categoryForm.sort" :min="0" :max="9999" />
              </el-form-item>
              <el-form-item label="状态" prop="enabled">
                <el-switch v-model="categoryForm.enabled" active-text="启用" inactive-text="停用" />
              </el-form-item>
            </div>
          </el-form>
        </section>

        <el-divider />

        <section class="priority-section">
          <header class="section-heading">
            <div>
              <h2>优先级配置</h2>
              <p>固定四项编码仅允许调整名称、颜色、排序和启停；MEDIUM 必须保持启用。</p>
            </div>
            <el-button type="primary" :loading="prioritySaving" :disabled="Boolean(priorityError)" @click="savePriorities">
              保存优先级
            </el-button>
          </header>

          <ErrorState v-if="priorityError" :message="priorityError" @retry="loadPriorities" />
          <el-form v-else ref="priorityFormRef" v-loading="priorityLoading" :model="priorityForm">
            <div class="priority-grid">
              <article v-for="(item, index) in priorityForm.items" :key="item.code" class="priority-card">
                <div class="priority-card__title">
                  <span class="priority-dot" :style="{ backgroundColor: item.color }" />
                  <strong>{{ item.code }}</strong>
                  <el-switch v-model="item.enabled" :disabled="item.code === 'MEDIUM'" />
                </div>
                <el-form-item
                  label="展示名称"
                  :prop="`items.${index}.name`"
                  :rules="[{ required: true, whitespace: true, message: '名称不能为空', trigger: 'blur' }]"
                >
                  <el-input v-model="item.name" maxlength="32" />
                </el-form-item>
                <el-form-item
                  label="颜色"
                  :prop="`items.${index}.color`"
                  :rules="[{ pattern: /^#[0-9A-Fa-f]{6}$/, message: '请输入六位十六进制色值', trigger: 'blur' }]"
                >
                  <div class="color-field">
                    <el-color-picker v-model="item.color" color-format="hex" />
                    <el-input v-model="item.color" maxlength="7" @blur="item.color = item.color.toUpperCase()" />
                  </div>
                </el-form-item>
                <el-form-item label="排序" :prop="`items.${index}.sort`">
                  <el-input-number v-model="item.sort" :min="0" :max="9999" />
                </el-form-item>
              </article>
            </div>
          </el-form>
        </section>
      </main>
    </section>
  </section>
</template>

<style scoped>
.category-config-layout {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 20px;
  align-items: stretch;
}

.category-tree-panel,
.category-form-panel {
  min-width: 0;
}

.category-tree-panel {
  display: flex;
  flex-direction: column;
  min-height: 650px;
}

.panel-heading,
.section-heading,
.priority-card__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-heading {
  margin-bottom: 14px;
}

.panel-heading h2,
.section-heading h2 {
  margin: 0;
  color: var(--ops-text-primary);
  font-size: 18px;
}

.section-heading p {
  margin: 5px 0 0;
  color: var(--ops-text-secondary);
  font-size: 13px;
}

.category-tree {
  flex: 1;
  margin-top: 14px;
  min-height: 380px;
}

.category-tree--locked {
  pointer-events: none;
  opacity: 0.72;
}

.category-tree__node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding-right: 8px;
}

.category-tree-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 18px;
  border-top: 1px solid var(--ops-border-color);
}

.category-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
  margin-top: 20px;
}

.priority-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.priority-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--ops-border-color);
  border-radius: 8px;
  background: var(--ops-bg-page);
}

.priority-card__title {
  justify-content: flex-start;
  margin-bottom: 14px;
}

.priority-card__title .el-switch {
  margin-left: auto;
}

.priority-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.color-field {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  width: 100%;
}

.field-error {
  width: 100%;
  color: var(--ops-danger-color);
  font-size: 12px;
}

:deep(.category-form-grid .el-select),
:deep(.category-form-grid .el-tree-select),
:deep(.category-form-grid .el-input-number),
:deep(.priority-card .el-input-number) {
  width: 100%;
}

@media (max-width: 1280px) {
  .priority-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .category-config-layout,
  .category-form-grid {
    grid-template-columns: 1fr;
  }

  .category-tree-panel {
    min-height: 480px;
  }
}

@media (max-width: 640px) {
  .section-heading,
  .priority-grid {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
