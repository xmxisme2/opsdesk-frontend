<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ content?: string }>(), { content: '' })

/**
 * 安全渲染轻量 Markdown：先转义所有用户内容，再仅插入本组件生成的标签。
 * 不依赖 v-html 直接信任原文，避免知识文章中的脚本和事件属性被浏览器执行。
 */
function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function isSafeHref(value: string) {
  return /^(https?:\/\/|mailto:|\/[^/]|#)/i.test(value)
}

function renderInline(value: string) {
  const escaped = escapeHtml(value)
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)]\(([^)\s]+)\)/g, (_, label: string, href: string) => isSafeHref(href) ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>` : label)
}

/** 将常见 Markdown 块转换为受控 HTML，未识别语法保持普通文本。 */
function renderMarkdown(source: string) {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let paragraph: string[] = []
  let unordered: string[] = []
  let ordered: string[] = []
  let codeLines: string[] = []
  let inCodeBlock = false
  const flushParagraph = () => { if (paragraph.length) { html.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`); paragraph = [] } }
  const flushUnordered = () => { if (unordered.length) { html.push(`<ul>${unordered.map(item => `<li>${renderInline(item)}</li>`).join('')}</ul>`); unordered = [] } }
  const flushOrdered = () => { if (ordered.length) { html.push(`<ol>${ordered.map(item => `<li>${renderInline(item)}</li>`).join('')}</ol>`); ordered = [] } }
  const flushCode = () => { if (codeLines.length) { html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`); codeLines = [] } }

  for (const line of lines) {
    if (line.trim().startsWith('```')) { if (inCodeBlock) flushCode(); else { flushParagraph(); flushUnordered(); flushOrdered() }; inCodeBlock = !inCodeBlock; continue }
    if (inCodeBlock) { codeLines.push(line); continue }
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    const bullet = line.match(/^[-*]\s+(.+)$/)
    const number = line.match(/^\d+[.)]\s+(.+)$/)
    if (heading) { flushParagraph(); flushUnordered(); flushOrdered(); html.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`); continue }
    if (/^\s*([-*_])\1\1+\s*$/.test(line)) { flushParagraph(); flushUnordered(); flushOrdered(); html.push('<hr>'); continue }
    if (bullet) { flushParagraph(); flushOrdered(); unordered.push(bullet[1]); continue }
    if (number) { flushParagraph(); flushUnordered(); ordered.push(number[1]); continue }
    if (!line.trim()) { flushParagraph(); flushUnordered(); flushOrdered(); continue }
    paragraph.push(line)
  }
  if (inCodeBlock) flushCode()
  flushParagraph(); flushUnordered(); flushOrdered()
  return html.join('') || '<p>暂无正文</p>'
}

const renderedHtml = computed(() => renderMarkdown(props.content))
</script>

<template>
  <div class="markdown-viewer" v-html="renderedHtml" />
</template>

<style scoped>
.markdown-viewer{color:#0f131a;font:14px/1.8 Inter,"Microsoft YaHei",sans-serif;word-break:break-word}.markdown-viewer :deep(h1),.markdown-viewer :deep(h2),.markdown-viewer :deep(h3){margin:24px 0 10px;line-height:1.35}.markdown-viewer :deep(h1){font-size:22px}.markdown-viewer :deep(h2){font-size:18px}.markdown-viewer :deep(h3){font-size:16px}.markdown-viewer :deep(p){margin:0 0 14px}.markdown-viewer :deep(ul),.markdown-viewer :deep(ol){margin:0 0 14px;padding-left:24px}.markdown-viewer :deep(code){padding:2px 5px;border-radius:4px;background:#eef2f7;color:#b42318;font-family:Consolas,monospace}.markdown-viewer :deep(pre){overflow:auto;margin:16px 0;padding:14px;border-radius:6px;background:#1f2633;color:#e5edf8}.markdown-viewer :deep(pre code){padding:0;background:transparent;color:inherit}.markdown-viewer :deep(a){color:#1252ad;text-decoration:none}.markdown-viewer :deep(hr){border:0;border-top:1px solid #dbe3ed;margin:20px 0}
</style>
