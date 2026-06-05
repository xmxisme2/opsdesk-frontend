import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import App from './App.vue'
import { setupRouter } from './router'
import { setupStore } from './stores'
import './styles/variables.css'
import './styles/base.css'
import './styles/element-plus.css'
import './styles/page.css'

// 应用入口统一注册 Pinia、Router 和 Element Plus，中文语言包保证分页、日期等基础组件文案一致。
const app = createApp(App)

setupStore(app)
setupRouter(app)

app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
