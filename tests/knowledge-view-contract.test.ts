import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const listView = readFileSync(new URL('../src/views/knowledge/KnowledgeListView.vue', import.meta.url), 'utf8')
const detailView = readFileSync(new URL('../src/views/knowledge/KnowledgeDetailView.vue', import.meta.url), 'utf8')

test('知识库列表具备分页、错误重试、分类标签筛选和维护入口', () => {
  assert.match(listView, /PaginationBar/)
  assert.match(listView, /@retry="loadArticles"/)
  assert.match(listView, /getKnowledgeCategoryTree/)
  assert.match(listView, /searchKnowledgeTags/)
  assert.match(listView, /新建文章/)
  assert.doesNotMatch(listView, /FeaturePlaceholder/)
})

test('知识库详情具备保存、发布、下线和删除动作', () => {
  assert.match(detailView, /createKnowledgeArticle/)
  assert.match(detailView, /publishKnowledgeArticle/)
  assert.match(detailView, /offlineKnowledgeArticle/)
  assert.match(detailView, /deleteKnowledgeArticle/)
  assert.doesNotMatch(detailView, /FeaturePlaceholder/)
})
