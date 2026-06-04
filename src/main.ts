import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import { setupRouter } from './router'
import { setupStore } from './stores'
import './styles/variables.css'
import './styles/base.css'
import './styles/element-plus.css'
import './styles/page.css'

// 应用入口统一注册 Pinia、Router 和 Element Plus，后续页面只关注业务组件。
const app = createApp(App)

setupStore(app)
setupRouter(app)

app.use(ElementPlus)
app.mount('#app')
