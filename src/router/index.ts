import type { App } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { setupRouterGuards } from './guards'

export const router = createRouter({
  // 使用 Vite 构建基路径，保证生产环境刷新 /opsdesk/* 路由时仍由同一 SPA 接管。
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

setupRouterGuards(router)

export function setupRouter(app: App) {
  app.use(router)
}
