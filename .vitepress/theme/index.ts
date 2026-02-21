import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './style.css'
import './styles/animations.css'
import './components/ai-chat/styles/index.css'
import HomePortal from './components/HomePortal.vue'
import SectionHub from './components/SectionHub.vue'
import SectionHero from './components/SectionHero.vue'
import HomePage from './components/pages/HomePage.vue'
import PostsPage from './components/pages/PostsPage.vue'
import KnowledgePage from './components/pages/KnowledgePage.vue'
import ResourcesPage from './components/pages/ResourcesPage.vue'
import AboutPage from './components/pages/AboutPage.vue'
import ChatPage from './components/pages/ChatPage.vue'
import { ChatLayout } from './components/ai-chat'
import Breadcrumb from './components/Breadcrumb.vue'
import GlobalSidebar from './components/GlobalSidebar.vue'
import TocSidebar from './components/TocSidebar.vue'
import TocFab from './components/TocFab.vue'
import { useData, useRoute } from 'vitepress'
import type { Theme } from 'vitepress'

import { createPinia } from 'pinia'
import InlineMarkdownEditor from './components/features/InlineMarkdownEditor.vue'
import AboutProfile from './components/Dashboards/AboutProfile.vue'
import KnowledgeGraph from './components/features/KnowledgeGraph.vue'
import RAGSearch from './components/features/RAGSearch.vue'
import EditFab from './components/EditFab.vue'


import GlobalPageEditorAGI from './components/agent/GlobalPageEditorAGI.vue'
import AgentModeToggle from './components/agent/AgentModeToggle.vue'
import InlineSuggestion from './components/agent/InlineSuggestion.vue'
import ContextIndicator from './components/agent/ContextIndicator.vue'
import ControlCenter from './components/ControlCenter.vue'
import FullScreenPanel from './components/FullScreenPanel.vue'

// Animation Components
import AnimatedContainer from './components/AnimatedContainer.vue'
import AnimatedButton from './components/AnimatedButton.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(Layout, null, {})
  },
  enhanceApp({ app, router, siteData }) {
    const pinia = createPinia()
    app.use(pinia)
    
    // Register components
    app.component('HomePortal', HomePortal)
    app.component('SectionHub', SectionHub)
    app.component('SectionHero', SectionHero)
    app.component('HomePage', HomePage)
    app.component('PostsPage', PostsPage)
    app.component('KnowledgePage', KnowledgePage)
    app.component('ResourcesPage', ResourcesPage)
    app.component('AboutPage', AboutPage)
    app.component('ChatPage', ChatPage)
    app.component('ChatLayout', ChatLayout)
    app.component('InlineMarkdownEditor', InlineMarkdownEditor)
    app.component('AboutProfile', AboutProfile)
    app.component('KnowledgeGraph', KnowledgeGraph)
    app.component('RAGSearch', RAGSearch)
    app.component('GlobalSidebar', GlobalSidebar)
    app.component('TocSidebar', TocSidebar)
    app.component('TocFab', TocFab)
    app.component('EditFab', EditFab)
    app.component('Breadcrumb', Breadcrumb)
    

    app.component('GlobalPageEditorAGI', GlobalPageEditorAGI)
    app.component('AgentModeToggle', AgentModeToggle)
    app.component('InlineSuggestion', InlineSuggestion)
    app.component('ContextIndicator', ContextIndicator)
    app.component('ControlCenter', ControlCenter)
    app.component('FullScreenPanel', FullScreenPanel)
    
    // Register Animation components
    app.component('AnimatedContainer', AnimatedContainer)
    app.component('AnimatedButton', AnimatedButton)
  }
} satisfies Theme

// Utility function for sidebar data (can be used in components)
export function useSidebarData() {
    const { theme } = useData()
    const route = useRoute()
    const sidebar = theme.value.sidebar || {}
    
    // Find key that matches current path
    const path = route.path
    const matchedKey = Object.keys(sidebar).find(key => path.startsWith(key))
    
    return matchedKey ? sidebar[matchedKey] : []
}
