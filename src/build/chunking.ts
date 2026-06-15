const NODE_MODULES_SEGMENT = '/node_modules/'
const ELEMENT_COMPONENT_CHUNKS: Record<string, string> = {
  autocomplete: 'vendor-element-form',
  button: 'vendor-element-form',
  cascader: 'vendor-element-form',
  'cascader-panel': 'vendor-element-form',
  checkbox: 'vendor-element-form',
  'color-picker': 'vendor-element-form',
  'color-picker-panel': 'vendor-element-form',
  'date-picker': 'vendor-element-form',
  'date-picker-panel': 'vendor-element-form',
  form: 'vendor-element-form',
  input: 'vendor-element-form',
  'input-number': 'vendor-element-form',
  'input-otp': 'vendor-element-form',
  'input-tag': 'vendor-element-form',
  mention: 'vendor-element-form',
  radio: 'vendor-element-form',
  rate: 'vendor-element-form',
  segmented: 'vendor-element-form',
  select: 'vendor-element-form',
  'select-v2': 'vendor-element-form',
  slider: 'vendor-element-form',
  switch: 'vendor-element-form',
  'time-picker': 'vendor-element-form',
  'time-select': 'vendor-element-form',
  transfer: 'vendor-element-form',
  'tree-select': 'vendor-element-form',
  upload: 'vendor-element-form',
  badge: 'vendor-element-data',
  'check-tag': 'vendor-element-data',
  descriptions: 'vendor-element-data',
  pagination: 'vendor-element-data',
  progress: 'vendor-element-data',
  statistic: 'vendor-element-data',
  table: 'vendor-element-data',
  'table-v2': 'vendor-element-data',
  tag: 'vendor-element-data',
  text: 'vendor-element-data',
  timeline: 'vendor-element-data',
  tree: 'vendor-element-data',
  'tree-v2': 'vendor-element-data',
  'virtual-list': 'vendor-element-data',
  alert: 'vendor-element-feedback',
  backtop: 'vendor-element-feedback',
  dialog: 'vendor-element-feedback',
  drawer: 'vendor-element-feedback',
  empty: 'vendor-element-feedback',
  'focus-trap': 'vendor-element-feedback',
  image: 'vendor-element-feedback',
  'image-viewer': 'vendor-element-feedback',
  loading: 'vendor-element-feedback',
  message: 'vendor-element-feedback',
  'message-box': 'vendor-element-feedback',
  notification: 'vendor-element-feedback',
  overlay: 'vendor-element-feedback',
  popconfirm: 'vendor-element-feedback',
  popover: 'vendor-element-feedback',
  popper: 'vendor-element-feedback',
  result: 'vendor-element-feedback',
  skeleton: 'vendor-element-feedback',
  tooltip: 'vendor-element-feedback',
  tour: 'vendor-element-feedback',
  watermark: 'vendor-element-feedback',
  affix: 'vendor-element-layout',
  anchor: 'vendor-element-layout',
  avatar: 'vendor-element-layout',
  breadcrumb: 'vendor-element-layout',
  calendar: 'vendor-element-layout',
  card: 'vendor-element-layout',
  carousel: 'vendor-element-layout',
  col: 'vendor-element-layout',
  collapse: 'vendor-element-layout',
  'collapse-transition': 'vendor-element-layout',
  collection: 'vendor-element-layout',
  'config-provider': 'vendor-element-layout',
  container: 'vendor-element-layout',
  countdown: 'vendor-element-layout',
  divider: 'vendor-element-layout',
  dropdown: 'vendor-element-layout',
  'infinite-scroll': 'vendor-element-layout',
  link: 'vendor-element-layout',
  menu: 'vendor-element-layout',
  'page-header': 'vendor-element-layout',
  'roving-focus-group': 'vendor-element-layout',
  row: 'vendor-element-layout',
  scrollbar: 'vendor-element-layout',
  slot: 'vendor-element-layout',
  space: 'vendor-element-layout',
  splitter: 'vendor-element-layout',
  steps: 'vendor-element-layout',
  tabs: 'vendor-element-layout',
}

function normalizeModuleId(moduleId: string) {
  return moduleId.replaceAll('\\', '/')
}

function isPackagePath(moduleId: string, packageName: string) {
  return moduleId.includes(`${NODE_MODULES_SEGMENT}${packageName}/`)
}

function getElementPlusComponentChunk(moduleId: string) {
  const componentMatch = moduleId.match(/\/node_modules\/element-plus\/es\/components\/([^/]+)\//)
  return componentMatch ? (ELEMENT_COMPONENT_CHUNKS[componentMatch[1]] ?? 'vendor-element-core') : undefined
}

// 前端生产构建的第三方依赖分包规则集中维护，避免 Element Plus 等公共依赖被合并进业务共享块后触发大 chunk 警告。
export function getVendorChunkName(moduleId: string) {
  const normalizedId = normalizeModuleId(moduleId)
  if (!normalizedId.includes(NODE_MODULES_SEGMENT)) {
    return undefined
  }

  if (isPackagePath(normalizedId, '@vue') || isPackagePath(normalizedId, 'vue') || isPackagePath(normalizedId, 'vue-router') || isPackagePath(normalizedId, 'pinia')) {
    return 'vendor-vue'
  }
  if (isPackagePath(normalizedId, '@element-plus/icons-vue')) {
    return 'vendor-element-icons'
  }

  const elementPlusComponentChunk = getElementPlusComponentChunk(normalizedId)
  if (elementPlusComponentChunk) {
    return elementPlusComponentChunk
  }

  if (isPackagePath(normalizedId, 'element-plus')) {
    return 'vendor-element-core'
  }
  if (
    isPackagePath(normalizedId, '@vueuse') ||
    isPackagePath(normalizedId, '@popperjs') ||
    isPackagePath(normalizedId, '@ctrl') ||
    isPackagePath(normalizedId, 'async-validator') ||
    isPackagePath(normalizedId, 'dayjs') ||
    isPackagePath(normalizedId, 'escape-html') ||
    isPackagePath(normalizedId, 'lodash-es') ||
    isPackagePath(normalizedId, 'lodash-unified') ||
    isPackagePath(normalizedId, 'memoize-one') ||
    isPackagePath(normalizedId, 'normalize-wheel-es')
  ) {
    return 'vendor-element-utils'
  }
  if (isPackagePath(normalizedId, 'axios')) {
    return 'vendor-http'
  }
  if (isPackagePath(normalizedId, 'echarts') || isPackagePath(normalizedId, 'zrender')) {
    return 'vendor-echarts'
  }

  return 'vendor-misc'
}

// Rolldown 的 codeSplitting group 先用 test 过滤候选模块，再用 name 函数生成具体 chunk 名称。
export function isVendorChunkCandidate(moduleId: string) {
  return normalizeModuleId(moduleId).includes(NODE_MODULES_SEGMENT)
}
