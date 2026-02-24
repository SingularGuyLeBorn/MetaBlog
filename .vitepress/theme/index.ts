import { h, defineAsyncComponent } from 'vue'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './style.css'
import './styles/animations.css'
import './components/ai-chat/styles/index.css'
import type { Theme } from 'vitepress'
import { useData, useRoute } from 'vitepress'
import { createPinia } from 'pinia'

// ========== Pages ==========
import HomePage from './components/pages/HomePage.vue'
import PostsPage from './components/pages/PostsPage.vue'
import KnowledgePage from './components/pages/KnowledgePage.vue'
import ResourcesPage from './components/pages/ResourcesPage.vue'
import AboutPage from './components/pages/AboutPage.vue'
import ChatPage from './components/pages/ChatPage.vue'

// ========== AI Chat Module ==========
import { ChatLayout } from './components/ai-chat'

// ========== Layout Components ==========
import Breadcrumb from './components/layout/Breadcrumb.vue'
import GlobalSidebar from './components/layout/GlobalSidebar.vue'
import TocSidebar from './components/layout/TocSidebar.vue'
import TocFab from './components/layout/TocFab.vue'

// ========== Home Components ==========
import HomePortal from './components/home/HomePortal.vue'
import SectionHub from './components/home/SectionHub.vue'
import SectionHero from './components/home/SectionHero.vue'

// ========== Feature Components ==========
import InlineMarkdownEditor from './components/features/InlineMarkdownEditor.vue'
import KnowledgeGraph from './components/features/KnowledgeGraph.vue'
import RAGSearch from './components/features/RAGSearch.vue'

// ========== Dashboard Components ==========
import AboutProfile from './components/Dashboards/AboutProfile.vue'

// ========== Editor Components ==========
import EditFab from './components/editor/EditFab.vue'

// ========== Test Components ==========
import ToolTester3D from './components/test/ToolTester3D.vue'
import TestCard3D from './components/test/TestCard3D.vue'
import AIProjectCard from './components/test/AIProjectCard.vue'
import TestResultModal from './components/test/TestResultModal.vue'

// ========== UI Components ==========
import AnimatedContainer from './components/ui/AnimatedContainer.vue'
import AnimatedButton from './components/ui/AnimatedButton.vue'

// ========== Legacy Components ==========
import ControlCenter from './components/legacy/ControlCenter.vue'
import FullScreenPanel from './components/legacy/FullScreenPanel.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(Layout, null, {})
  },
  enhanceApp({ app, router, siteData }) {
    const pinia = createPinia()
    app.use(pinia)
    
    // ========== Register Pages ==========
    app.component('HomePage', HomePage)
    app.component('PostsPage', PostsPage)
    app.component('KnowledgePage', KnowledgePage)
    app.component('ResourcesPage', ResourcesPage)
    app.component('AboutPage', AboutPage)
    app.component('ChatPage', ChatPage)
    
    // ========== Register AI Chat ==========
    app.component('ChatLayout', ChatLayout)
    
    // ========== Register Layout ==========
    app.component('Breadcrumb', Breadcrumb)
    app.component('GlobalSidebar', GlobalSidebar)
    app.component('TocSidebar', TocSidebar)
    app.component('TocFab', TocFab)
    
    // ========== Register Home Components ==========
    app.component('HomePortal', HomePortal)
    app.component('SectionHub', SectionHub)
    app.component('SectionHero', SectionHero)
    
    // ========== Register Features ==========
    app.component('InlineMarkdownEditor', InlineMarkdownEditor)
    app.component('KnowledgeGraph', KnowledgeGraph)
    app.component('RAGSearch', RAGSearch)
    
    // ========== Register Dashboards ==========
    app.component('AboutProfile', AboutProfile)
    
    // ========== Register Editor ==========
    app.component('EditFab', EditFab)
    
    // ========== Register Test Components ==========
    app.component('ToolTester3D', ToolTester3D)
    app.component('TestCard3D', TestCard3D)
    app.component('AIProjectCard', AIProjectCard)
    app.component('TestResultModal', TestResultModal)
    
    // ========== Register UI ==========
    app.component('AnimatedContainer', AnimatedContainer)
    app.component('AnimatedButton', AnimatedButton)
    
    // ========== Register Legacy ==========
    app.component('ControlCenter', ControlCenter)
    app.component('FullScreenPanel', FullScreenPanel)
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
