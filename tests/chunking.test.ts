import assert from 'node:assert/strict'
import test from 'node:test'
import { getVendorChunkName } from '../src/build/chunking.ts'

// 构建分包测试防止 ECharts 与 ZRender 再次回归为单个超大 vendor chunk。
test('ECharts 按职责拆分 vendor chunk', () => {
  assert.equal(getVendorChunkName('/repo/node_modules/echarts/lib/chart/line/LineSeries.js'), 'vendor-echarts-charts')
  assert.equal(getVendorChunkName('/repo/node_modules/echarts/lib/component/tooltip/TooltipView.js'), 'vendor-echarts-components')
  assert.equal(getVendorChunkName('/repo/node_modules/echarts/lib/core/echarts.js'), 'vendor-echarts-core')
  assert.equal(getVendorChunkName('/repo/node_modules/zrender/lib/Storage.js'), 'vendor-zrender')
})
