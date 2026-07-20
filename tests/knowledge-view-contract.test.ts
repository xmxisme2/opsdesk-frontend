import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const listView = readFileSync(new URL('../src/views/knowledge/KnowledgeListView.vue', import.meta.url), 'utf8')
const detailView = readFileSync(new URL('../src/views/knowledge/KnowledgeDetailView.vue', import.meta.url), 'utf8')
const ticketDetailView = readFileSync(new URL('../src/views/tickets/TicketDetailView.vue', import.meta.url), 'utf8')

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

test('终态工单可按选项生成知识草稿并跳转编辑页', () => {
  assert.match(ticketDetailView, /createKnowledgeArticleFromTicket/)
  assert.match(ticketDetailView, /includeAttachments/)
  assert.match(ticketDetailView, /生成知识草稿/)
  assert.match(ticketDetailView, /COMPLETED.*CLOSED/)
})

test('工单完成时采集结构化解决方案并在详情页展示', () => {
  assert.match(ticketDetailView, /resolutionSummary/)
  assert.match(ticketDetailView, /resolutionSteps/)
  assert.match(ticketDetailView, /resolutionVerified/)
  assert.match(ticketDetailView, /解决方案摘要/)
  assert.match(ticketDetailView, /处理步骤/)
})
