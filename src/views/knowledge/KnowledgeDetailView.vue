<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { createKnowledgeArticle, deleteKnowledgeArticle, getKnowledgeArticleDetail, getKnowledgeCategoryTree, offlineKnowledgeArticle, publishKnowledgeArticle, searchKnowledgeTags, updateKnowledgeArticle } from '@/api/modules/knowledge'
import ErrorState from '@/components/feedback/ErrorState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useAuthStore } from '@/stores/modules/auth'
import { formatDateTime } from '@/utils/format-date'
import type { KnowledgeArticleMutation, KnowledgeArticleVO, KnowledgeCategoryVO, KnowledgeTagVO } from '@/types/knowledge'

const route=useRoute();const router=useRouter();const authStore=useAuthStore()
const id=computed(()=>String(route.params.id));const isNew=computed(()=>id.value==='new')
const article=ref<KnowledgeArticleVO>();const categories=ref<KnowledgeCategoryVO[]>([]);const tagOptions=ref<KnowledgeTagVO[]>([])
const loading=ref(false);const saving=ref(false);const errorMessage=ref('')
const canMaintain=computed(()=>authStore.hasRole(['AGENT','MANAGER','ADMIN']))
const canManage=computed(()=>authStore.hasRole(['MANAGER','ADMIN']))
const editing=ref(false)
const form=reactive<KnowledgeArticleMutation>({title:'',summary:'',content:'',categoryId:undefined,tags:[],sourceTicketId:undefined})

// 对齐 Figma 64:490：阅读态保留正文和来源信息，维护者可切换编辑态并执行发布动作。
function fillForm(value:KnowledgeArticleVO){form.title=value.title;form.summary=value.summary;form.content=value.content;form.categoryId=value.categoryId;form.tags=[...value.tags];form.sourceTicketId=value.sourceTicketId}
async function load(){if(isNew.value){if(!canMaintain.value){router.replace('/knowledge');return}editing.value=true;return}loading.value=true;errorMessage.value='';try{article.value=await getKnowledgeArticleDetail(id.value);fillForm(article.value)}catch(error){errorMessage.value=error instanceof Error?error.message:'文章加载失败'}finally{loading.value=false}}
async function loadOptions(){const [c,t]=await Promise.all([getKnowledgeCategoryTree(true),searchKnowledgeTags()]);categories.value=c;tagOptions.value=t}
async function save(){if(!form.title.trim()||!form.content.trim()){ElMessage.warning('请填写标题和正文');return}saving.value=true;try{const result=isNew.value?await createKnowledgeArticle(form):await updateKnowledgeArticle(id.value,form);ElMessage.success('文章已保存');if(isNew.value)await router.replace(`/knowledge/${result.id}`);article.value=result;fillForm(result);editing.value=false}catch{}finally{saving.value=false}}
async function publish(){article.value=await publishKnowledgeArticle(id.value);ElMessage.success('文章已发布')}
async function offline(){const {value}=await ElMessageBox.prompt('请输入下线原因','下线文章',{inputValidator:(v)=>Boolean(v.trim())||'请输入原因'});article.value=await offlineKnowledgeArticle(id.value,value);ElMessage.success('文章已下线')}
async function remove(){await ElMessageBox.confirm('删除后文章不可恢复，确认继续？','删除文章',{type:'warning'});await deleteKnowledgeArticle(id.value);ElMessage.success('文章已删除');router.replace('/knowledge')}
onMounted(()=>Promise.allSettled([loadOptions(),load()]))
</script>

<template>
  <section class="page-stack knowledge-detail">
    <PageHeader :title="isNew?'新建知识文章':article?.title||'知识库详情'" :description="article?`${article.authorName} · 更新于 ${formatDateTime(article.updatedAt)}`:'沉淀可复用的解决方案'">
      <template #actions>
        <el-button @click="router.push('/knowledge')">返回列表</el-button>
        <el-button v-if="canMaintain&&!editing&&!isNew" type="primary" @click="editing=true">编辑</el-button>
        <el-button v-if="editing" type="primary" :loading="saving" @click="save">保存草稿</el-button>
        <el-button v-if="canManage&&article?.status!=='PUBLISHED'&&!editing" type="success" @click="publish">发布</el-button>
        <el-button v-if="canManage&&article?.status==='PUBLISHED'&&!editing" @click="offline">下线</el-button>
        <el-button v-if="canManage&&!isNew&&!editing" type="danger" plain @click="remove">删除</el-button>
      </template>
    </PageHeader>
    <section v-loading="loading" class="page-panel knowledge-content">
      <ErrorState v-if="errorMessage" :message="errorMessage" @retry="load" />
      <el-form v-else-if="editing" label-position="top" class="editor-form">
        <el-form-item label="文章标题" required><el-input v-model="form.title" maxlength="200" show-word-limit/></el-form-item>
        <el-form-item label="摘要"><el-input v-model="form.summary" type="textarea" :rows="2" maxlength="500" show-word-limit/></el-form-item>
        <div class="editor-grid"><el-form-item label="分类"><el-tree-select v-model="form.categoryId" :data="categories" node-key="id" :props="{label:'name',children:'children'}" check-strictly clearable/></el-form-item><el-form-item label="标签"><el-select v-model="form.tags" multiple filterable allow-create default-first-option><el-option v-for="tag in tagOptions" :key="tag.id" :label="tag.name" :value="tag.name"/></el-select></el-form-item></div>
        <el-form-item label="Markdown 正文" required><el-input v-model="form.content" type="textarea" :rows="20" placeholder="# 问题描述&#10;&#10;## 处理步骤"/></el-form-item>
      </el-form>
      <article v-else-if="article" class="article-view">
        <div class="article-meta"><el-tag>{{article.categoryName||'未分类'}}</el-tag><el-tag v-for="tag in article.tags" :key="tag" effect="plain">{{tag}}</el-tag><span>{{article.viewCount}} 次浏览</span><router-link v-if="article.sourceTicketId" :to="`/tickets/${article.sourceTicketId}`">来源工单 {{article.sourceTicketNo||article.sourceTicketId}}</router-link></div>
        <p v-if="article.summary" class="article-summary">{{article.summary}}</p><pre class="markdown-content">{{article.content}}</pre>
      </article>
    </section>
  </section>
</template>

<style scoped>
.knowledge-content{min-height:560px}.editor-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.article-meta{display:flex;align-items:center;gap:8px;color:var(--ops-text-secondary);font-size:13px}.article-summary{margin:24px 0;padding:16px;border-left:4px solid #1252ad;background:#f5f8fc;color:#39475a}.markdown-content{margin:24px 0 0;white-space:pre-wrap;font:14px/1.8 Inter,"Microsoft YaHei",sans-serif;color:#0f131a}@media(max-width:760px){.editor-grid{grid-template-columns:1fr}}
</style>
