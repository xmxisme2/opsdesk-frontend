import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { getVendorChunkName, isVendorChunkCandidate } from './src/build/chunking'

// 前端初始化阶段只配置 Vue 插件、路径别名和本地代理，真实联调等待后端工程启动后再补充。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // 将体积较大的第三方依赖拆成稳定 vendor chunk，避免 Element Plus 被并入 http 共享块后超过 Vite 默认 500KB 警戒线。
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            {
              name: (moduleId) => getVendorChunkName(moduleId) ?? null,
              test: isVendorChunkCandidate,
              priority: 10,
            },
          ],
        },
        strictExecutionOrder: true,
      },
    },
  },
})
