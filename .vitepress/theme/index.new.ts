/**
 * Theme Index - 新架构主题入口
 * 
 * 包含 Pinia 状态管理的注册
 */
import type { Theme } from 'vitepress'
import { createPinia } from 'pinia'
import DefaultTheme from 'vitepress/theme'
import { createPersistPlugin } from '../agent/stores/plugins/persistPlugin'
import { createLoggerPlugin } from '../agent/stores/plugins/loggerPlugin'

// 导入组件
import AIChatOrbNew from './components/agent/AIChatOrbNew.vue'

// 样式
import './style.css'

const pinia = createPinia()

// 开发环境启用日志
if (import.meta.env.DEV) {
  pinia.use(createLoggerPlugin({
    enabled: true,
    logStateChanges: true,
    logActions: true,
    logTiming: true,
    slowActionThreshold: 100
  }))
}

// 持久化插件
pinia.use(createPersistPlugin({
  prefix: 'metablog:',
  debounce: 500,
  compress: false
}))

export default {
  extends: DefaultTheme,
  
  enhanceApp({ app, router, siteData }) {
    // 注册 Pinia
    app.use(pinia)
    
    // 注册全局组件
    app.component('AIChatOrbNew', AIChatOrbNew)
    
    // 全局错误处理
    app.config.errorHandler = (err, instance, info) => {
      console.error('[Vue Error]', err)
      console.error('Component:', instance)
      console.error('Info:', info)
    }
    
    // 路由变化时保存状态
    router.onBeforeRouteChange = (to) => {
      // 可以在这里做路由级别的状态管理
    }
  }
} as Theme
