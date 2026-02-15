import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './style.css'
import HomePortal from './components/HomePortal.vue'
import SectionHub from './components/SectionHub.vue'
import Breadcrumb from './components/Breadcrumb.vue'
import { useData, useRoute } from 'vitepress'
import type { Theme } from 'vitepress'

import { createPinia } from 'pinia'
import GlobalPageEditor from './components/features/GlobalPageEditor.vue'
import AboutProfile from './components/Dashboards/AboutProfile.vue'
import KnowledgeGraph from './components/features/KnowledgeGraph.vue'
import RAGSearch from './components/features/RAGSearch.vue'
import GlobalSidebar from './components/GlobalSidebar.vue'

import EditorTrigger from './components/EditorTrigger.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(Layout, null, {
      'doc-before': () => h(Breadcrumb)
    })
  },
  enhanceApp({ app, router, siteData }) {
    const pinia = createPinia()
    app.use(pinia)
    
    app.component('HomePortal', HomePortal)
    app.component('SectionHub', SectionHub)
    app.component('GlobalPageEditor', GlobalPageEditor)
    app.component('AboutProfile', AboutProfile)
    app.component('KnowledgeGraph', KnowledgeGraph)
    app.component('RAGSearch', RAGSearch)
  }
} satisfies Theme

function useSidebarData() {
    const { theme } = useData()
    const route = useRoute()
    const sidebar = theme.value.sidebar || {}
    
    // Find key that matches current path
    const path = route.path
    const matchedKey = Object.keys(sidebar).find(key => path.startsWith(key))
    
    return matchedKey ? sidebar[matchedKey] : []
}
