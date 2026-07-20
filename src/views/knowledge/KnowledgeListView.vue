<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { getKnowledgeCategoryTree, searchKnowledgeArticles, searchKnowledgeTags } from '@/api/modules/knowledge'
import DataTable from '@/components/common/DataTable.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import { useAuthStore } from '@/stores/modules/auth'
import { formatDateTime } from '@/utils/format-date'
import type { KnowledgeArticleVO, KnowledgeCategoryVO, KnowledgeStatus, KnowledgeTagVO } from '@/types/knowledge'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const errorMessage = ref('')
const records = ref<KnowledgeArticleVO[]>([])
const total = ref(0)
const categories = ref<KnowledgeCategoryVO[]>([])
const tags = ref<KnowledgeTagVO[]>([])
const canMaintain = computed(() => authStore.hasRole(['AGENT', 'MANAGER', 'ADMIN']))
const query = reactive<{ page:number; size:number; keyword:string; categoryId?:string; tag?:string; status?:KnowledgeStatus }>({ page:1,size:10,keyword:'' })

// 对齐 Figma 64:402：紧凑筛选区、文章表格、维护入口和统一错误重试。
async function loadArticles(){loading.value=true;errorMessage.value='';try{const result=await searchKnowledgeArticles({...query,keyword:query.keyword.trim()||undefined});records.value=result.records;total.value=result.total}catch(error){errorMessage.value=error instanceof Error?error.message:'知识库加载失败'}finally{loading.value=false}}
async function loadOptions(){const [categoryResult,tagResult]=await Promise.allSettled([getKnowledgeCategoryTree(true),searchKnowledgeTags()]);if(categoryResult.status==='fulfilled')categories.value=categoryResult.value;if(tagResult.status==='fulfilled')tags.value=tagResult.value}
function search(){query.page=1;loadArticles()}
function reset(){query.keyword='';query.categoryId=undefined;query.tag=undefined;query.status=undefined;search()}
function statusType(status:KnowledgeStatus){return status==='PUBLISHED'?'success':status==='OFFLINE'?'info':'warning'}
function statusLabel(status:KnowledgeStatus){return {DRAFT:'草稿',PUBLISHED:'已发布',OFFLINE:'已下线'}[status]}
function openArticle(row:KnowledgeArticleVO){router.push(`/knowledge/${row.id}`)}
onMounted(()=>Promise.allSettled([loadOptions(),loadArticles()]))
</script>

<template>
  <section class="page-stack knowledge-page">
    <PageHeader title="知识库" description="文章列表、分类、标签、搜索，从工单沉淀解决方案">
      <template #actions><el-button v-if="canMaintain" type="primary" :icon="Plus" @click="router.push('/knowledge/new')">新建文章</el-button></template>
    </PageHeader>
    <section class="page-panel knowledge-filters">
      <el-form label-position="top" class="knowledge-filter-form" @submit.prevent="search">
        <el-form-item label="搜索"><el-input v-model="query.keyword" clearable placeholder="VPN / 权限 / 导入失败" @keyup.enter="search" /></el-form-item>
        <el-form-item label="分类"><el-tree-select v-model="query.categoryId" :data="categories" node-key="id" :props="{label:'name',children:'children'}" check-strictly clearable placeholder="全部分类" /></el-form-item>
        <el-form-item label="标签"><el-select v-model="query.tag" clearable filterable placeholder="全部标签"><el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.name" /></el-select></el-form-item>
        <el-form-item v-if="canMaintain" label="状态"><el-select v-model="query.status" clearable placeholder="全部状态"><el-option label="草稿" value="DRAFT"/><el-option label="已发布" value="PUBLISHED"/><el-option label="已下线" value="OFFLINE"/></el-select></el-form-item>
        <div class="knowledge-filter-actions"><el-button type="primary" :icon="Search" native-type="submit">查询</el-button><el-button :icon="Refresh" @click="reset">重置</el-button></div>
      </el-form>
    </section>
    <DataTable :loading="loading" :error="errorMessage" :empty="records.length===0" @retry="loadArticles">
      <el-table :data="records" row-key="id" @row-click="openArticle">
        <el-table-column label="标题" min-width="250"><template #default="{row}:{row:KnowledgeArticleVO}"><strong class="article-title">{{row.title}}</strong><small>{{row.summary||'暂无摘要'}}</small></template></el-table-column>
        <el-table-column prop="categoryName" label="分类" min-width="120"/>
        <el-table-column label="标签" min-width="180"><template #default="{row}:{row:KnowledgeArticleVO}"><el-tag v-for="tag in row.tags" :key="tag" size="small" effect="plain">{{tag}}</el-tag></template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{row}:{row:KnowledgeArticleVO}"><el-tag :type="statusType(row.status)">{{statusLabel(row.status)}}</el-tag></template></el-table-column>
        <el-table-column prop="authorName" label="作者" width="120"/>
        <el-table-column prop="viewCount" label="浏览" width="90"/>
        <el-table-column label="更新时间" width="170"><template #default="{row}:{row:KnowledgeArticleVO}">{{formatDateTime(row.updatedAt)}}</template></el-table-column>
      </el-table>
      <PaginationBar :page="query.page" :size="query.size" :total="total" @update:page="query.page=$event;loadArticles()" @update:size="query.size=$event;query.page=1;loadArticles()" />
    </DataTable>
  </section>
</template>

<style scoped>
.knowledge-filter-form{display:grid;grid-template-columns:minmax(240px,1.6fr) repeat(3,minmax(150px,1fr)) auto;gap:12px;align-items:end}.knowledge-filter-form :deep(.el-form-item){margin:0}.knowledge-filter-actions{display:flex;padding-bottom:1px}.article-title{display:block;color:#1252ad;cursor:pointer}.article-title+small{display:block;margin-top:5px;color:var(--ops-text-secondary)}.el-tag+.el-tag{margin-left:4px}@media(max-width:1000px){.knowledge-filter-form{grid-template-columns:1fr 1fr}.knowledge-filter-actions{grid-column:1/-1}}
</style>
