<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { GraphChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { dispose, getInstanceByDom, init, use, type ECharts } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

use([GraphChart, TooltipComponent, CanvasRenderer])

const props = withDefaults(defineProps<{ content?: string }>(), { content: '' })
const viewerRef = ref<HTMLElement>()
const diagrams: ECharts[] = []

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

/** 仅识别表头分隔线，避免将普通文本中的连字符误判为 Markdown 表格。 */
function isTableDivider(value: string) {
  const cells = value.trim().replace(/^\||\|$/g, '').split('|')
  return cells.length > 0 && cells.every(cell => /^\s*:?-{3,}:?\s*$/.test(cell))
}

function splitTableCells(value: string) {
  return value.trim().replace(/^\||\|$/g, '').split('|').map(item => item.trim())
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
  let codeLanguage = ''
  const flushParagraph = () => { if (paragraph.length) { html.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`); paragraph = [] } }
  const flushUnordered = () => { if (unordered.length) { html.push(`<ul>${unordered.map(item => `<li>${renderInline(item)}</li>`).join('')}</ul>`); unordered = [] } }
  const flushOrdered = () => { if (ordered.length) { html.push(`<ol>${ordered.map(item => `<li>${renderInline(item)}</li>`).join('')}</ol>`); ordered = [] } }
  const flushCode = () => {
    if (!codeLines.length) return
    const source = escapeHtml(codeLines.join('\n'))
    // Mermaid 仅解析流程图语法，并用 ECharts 本地绘制；其他 Mermaid 图保留源码，避免远程脚本和不受控 HTML。
    html.push(codeLanguage === 'mermaid'
      ? `<div class="mermaid-flow"><code>${source}</code></div>`
      : `<pre><code>${source}</code></pre>`)
    codeLines = []
    codeLanguage = ''
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) flushCode()
      else {
        flushParagraph(); flushUnordered(); flushOrdered()
        codeLanguage = line.trim().slice(3).trim().toLowerCase()
      }
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) { codeLines.push(line); continue }
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    const bullet = line.match(/^[-*]\s+(.+)$/)
    const number = line.match(/^\d+[.)]\s+(.+)$/)
    if (heading) { flushParagraph(); flushUnordered(); flushOrdered(); html.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`); continue }
    if (/^\s*([-*_])\1\1+\s*$/.test(line)) { flushParagraph(); flushUnordered(); flushOrdered(); html.push('<hr>'); continue }
    if (isTableDivider(lines[index + 1] ?? '') && line.includes('|')) {
      flushParagraph(); flushUnordered(); flushOrdered()
      const headers = splitTableCells(line)
      index += 1
      const rows: string[][] = []
      while (lines[index + 1]?.includes('|')) rows.push(splitTableCells(lines[++index]))
      const head = headers.map(item => `<th>${renderInline(item)}</th>`).join('')
      const body = rows.map(row => `<tr>${headers.map((_, cellIndex) => `<td>${renderInline(row[cellIndex] ?? '')}</td>`).join('')}</tr>`).join('')
      html.push(`<div class="markdown-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`)
      continue
    }
    if (bullet) {
      flushParagraph(); flushOrdered()
      const task = bullet[1].match(/^\[([ xX])\]\s+(.+)$/)
      unordered.push(task
        ? `<label class="markdown-task"><input type="checkbox" disabled${task[1].toLowerCase() === 'x' ? ' checked' : ''}><span>${renderInline(task[2])}</span></label>`
        : renderInline(bullet[1]))
      continue
    }
    if (number) { flushParagraph(); flushUnordered(); ordered.push(number[1]); continue }
    if (!line.trim()) { flushParagraph(); flushUnordered(); flushOrdered(); continue }
    paragraph.push(line)
  }
  if (inCodeBlock) flushCode()
  flushParagraph(); flushUnordered(); flushOrdered()
  return html.join('') || '<p>暂无正文</p>'
}

function parseFlowchart(source: string) {
  const lines = source.replace(/\r\n/g, '\n').split('\n').map(line => line.trim()).filter(Boolean)
  const direction = lines[0]?.match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL)$/i)?.[1]?.toUpperCase()
  if (!direction) return undefined
  const nodes = new Map<string, string>()
  const links: Array<{ source: string; target: string; label?: string }> = []
  const ensureNode = (id: string, label?: string) => nodes.set(id, label?.trim() || nodes.get(id) || id)
  for (const line of lines.slice(1)) {
    const match = line.match(/^([\w-]+)(?:\[([^\]]+)]|\(([^)]+)\)|\{([^}]+)})?\s*--(?:\s*\|([^|]+)\|)?\s*>\s*([\w-]+)(?:\[([^\]]+)]|\(([^)]+)\)|\{([^}]+)})?$/)
    if (!match) continue
    ensureNode(match[1], match[2] || match[3] || match[4])
    ensureNode(match[6], match[7] || match[8] || match[9])
    links.push({ source: match[1], target: match[6], label: match[5]?.trim() })
  }
  return nodes.size && links.length ? { direction, nodes, links } : undefined
}

function renderMermaidFlowcharts() {
  diagrams.splice(0).forEach(chart => chart.dispose())
  viewerRef.value?.querySelectorAll<HTMLElement>('.mermaid-flow').forEach(container => {
    const flowchart = parseFlowchart(container.textContent ?? '')
    if (!flowchart) {
      container.classList.add('mermaid-flow--unsupported')
      container.insertAdjacentHTML('afterbegin', '<p>此 Mermaid 图暂不支持可视化，已保留源码。</p>')
      return
    }
    container.replaceChildren()
    const existing = getInstanceByDom(container)
    if (existing) dispose(container)
    const chart = init(container)
    const horizontal = flowchart.direction === 'LR' || flowchart.direction === 'RL'
    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'graph', layout: 'force', roam: true, draggable: true,
        force: { repulsion: 680, edgeLength: horizontal ? 150 : 110 },
        label: { show: true, position: 'bottom', color: '#25364d', fontSize: 12 },
        lineStyle: { color: '#7b91b1', width: 1.5, curveness: 0.08 },
        edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 8,
        edgeLabel: { show: true, formatter: (params: { data?: { label?: string } }) => params.data?.label ?? '', color: '#66788f' },
        itemStyle: { color: '#2f6fb5', borderColor: '#1252ad', borderWidth: 1 },
        data: Array.from(flowchart.nodes, ([id, name]) => ({ id, name, symbolSize: 52 })),
        links: flowchart.links,
      }],
    })
    diagrams.push(chart)
  })
}

watch(() => props.content, async () => { await nextTick(); renderMermaidFlowcharts() })
onMounted(async () => { await nextTick(); renderMermaidFlowcharts() })
onBeforeUnmount(() => diagrams.splice(0).forEach(chart => chart.dispose()))
</script>

<template>
  <div ref="viewerRef" class="markdown-viewer" v-html="renderMarkdown(content)" />
</template>

<style scoped>
.markdown-viewer{color:#0f131a;font:14px/1.8 Inter,"Microsoft YaHei",sans-serif;word-break:break-word}.markdown-viewer :deep(h1),.markdown-viewer :deep(h2),.markdown-viewer :deep(h3){margin:24px 0 10px;line-height:1.35}.markdown-viewer :deep(h1){font-size:22px}.markdown-viewer :deep(h2){font-size:18px}.markdown-viewer :deep(h3){font-size:16px}.markdown-viewer :deep(p){margin:0 0 14px}.markdown-viewer :deep(ul),.markdown-viewer :deep(ol){margin:0 0 14px;padding-left:24px}.markdown-viewer :deep(.markdown-task){display:flex;align-items:flex-start;gap:8px;list-style:none}.markdown-viewer :deep(.markdown-task input){margin-top:6px;accent-color:#1252ad}.markdown-viewer :deep(code){padding:2px 5px;border-radius:4px;background:#eef2f7;color:#b42318;font-family:Consolas,monospace}.markdown-viewer :deep(pre){overflow:auto;margin:16px 0;padding:14px;border-radius:6px;background:#1f2633;color:#e5edf8}.markdown-viewer :deep(pre code){padding:0;background:transparent;color:inherit}.markdown-viewer :deep(a){color:#1252ad;text-decoration:none}.markdown-viewer :deep(hr){border:0;border-top:1px solid #dbe3ed;margin:20px 0}.markdown-viewer :deep(.markdown-table-wrap){overflow:auto;margin:16px 0;border:1px solid #dbe3ed;border-radius:6px}.markdown-viewer :deep(table){width:100%;border-collapse:collapse;min-width:420px}.markdown-viewer :deep(th),.markdown-viewer :deep(td){padding:9px 12px;border-bottom:1px solid #e6ebf2;text-align:left}.markdown-viewer :deep(th){background:#f5f8fc;color:#39475a;font-weight:600}.markdown-viewer :deep(tbody tr:last-child td){border-bottom:0}.markdown-viewer :deep(.mermaid-flow){height:310px;overflow:hidden;margin:16px 0;border:1px solid #dbe3ed;border-radius:8px;background:#f8fafc}.markdown-viewer :deep(.mermaid-flow--unsupported){height:auto;padding:12px;overflow:auto;background:#1f2633;color:#e5edf8}.markdown-viewer :deep(.mermaid-flow--unsupported p){color:#c5d3e5;font-size:12px}.markdown-viewer :deep(.mermaid-flow--unsupported code){display:block;padding:0;background:transparent;color:inherit;white-space:pre;font-family:Consolas,monospace}
</style>
