import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getVendorChunkName, isVendorChunkCandidate } from '../src/build/chunking.ts'

test('getVendorChunkName 按依赖职责拆分 vendor chunk', () => {
  assert.equal(getVendorChunkName('D:\\OpsDesk\\opsdesk-frontend\\node_modules\\vue\\dist\\vue.runtime.esm-bundler.js'), 'vendor-vue')
  assert.equal(getVendorChunkName('/repo/node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js'), 'vendor-vue')
  assert.equal(getVendorChunkName('/repo/node_modules/@element-plus/icons-vue/dist/index.js'), 'vendor-element-icons')
  assert.equal(getVendorChunkName('/repo/node_modules/element-plus/es/components/table/src/table.mjs'), 'vendor-element-data')
  assert.equal(getVendorChunkName('/repo/node_modules/element-plus/es/components/tree-select/src/tree-select.mjs'), 'vendor-element-form')
  assert.equal(getVendorChunkName('/repo/node_modules/element-plus/es/components/message/src/message.mjs'), 'vendor-element-feedback')
  assert.equal(getVendorChunkName('/repo/node_modules/element-plus/es/components/menu/src/menu.mjs'), 'vendor-element-layout')
  assert.equal(getVendorChunkName('/repo/node_modules/element-plus/es/index.mjs'), 'vendor-element-core')
  assert.equal(getVendorChunkName('/repo/node_modules/@vueuse/core/dist/index.js'), 'vendor-element-utils')
  assert.equal(getVendorChunkName('/repo/node_modules/axios/index.js'), 'vendor-http')
  assert.equal(getVendorChunkName('/repo/node_modules/echarts/core.js'), 'vendor-echarts')
})

test('isVendorChunkCandidate 只处理 node_modules 依赖', () => {
  assert.equal(isVendorChunkCandidate('/repo/node_modules/element-plus/es/index.mjs'), true)
  assert.equal(isVendorChunkCandidate('/repo/src/api/http.ts'), false)
  assert.equal(getVendorChunkName('/repo/src/api/http.ts'), undefined)
})
