/**
 * ============================================================================
 * 主题入口导出
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme
 */


import { createPinia } from "pinia";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import Layout from "./Layout.vue";
import "./style.css";
import "./styles/animations.css";
import "./styles/liquid-glass-theme.css";

// ========== Pages ==========
import AboutPage from "./components/pages/AboutPage.vue";
import ChatPage from "./components/pages/ChatPage.vue";
import HomePage from "./components/pages/HomePage.vue";
import KnowledgePage from "./components/pages/KnowledgePage.vue";
import PostsPage from "./components/pages/PostsPage.vue";
import ResourcesPage from "./components/pages/ResourcesPage.vue";

// ========== Features ==========
// Chat
import { ChatLayout } from "./components/ai-chat";

// Editor
import EditFab from "./components/editor/EditFab.vue";

// ========== Shared Components ==========
// Layout
import Breadcrumb from "./components/common/Breadcrumb.vue";
import GlobalSidebar from "./components/common/GlobalSidebar.vue";
import TocFab from "./components/common/TocFab.vue";
import TocSidebar from "./components/common/TocSidebar.vue";

// UI
import AnimatedButton from "./components/common/AnimatedButton.vue";
import AnimatedContainer from "./components/common/AnimatedContainer.vue";

// Home
import HomePortal from "./components/pages/HomePortal.vue";
import SectionHero from "./components/pages/SectionHero.vue";
import SectionHub from "./components/pages/SectionHub.vue";

// KB Features
import InlineMarkdownEditor from "./components/features/InlineMarkdownEditor.vue";
import KnowledgeGraph from "./components/features/KnowledgeGraph.vue";
import RAGSearch from "./components/features/RAGSearch.vue";

// Dashboards
import { ArticleCards, SectionIndex } from "./components/common";
import AboutProfile from "./components/common/AboutProfile.vue";

// Legacy
import ControlCenter from "./components/common/ControlCenter.vue";
import FullScreenPanel from "./components/common/FullScreenPanel.vue";

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(Layout, null, {});
  },
  enhanceApp({ app, router, siteData }) {
    const pinia = createPinia();
    app.use(pinia);

    // ========== Register Pages ==========
    app.component("HomePage", HomePage);
    app.component("PostsPage", PostsPage);
    app.component("KnowledgePage", KnowledgePage);
    app.component("ResourcesPage", ResourcesPage);
    app.component("AboutPage", AboutPage);
    app.component("ChatPage", ChatPage);

    // ========== Register Features ==========
    app.component("ChatLayout", ChatLayout);
    app.component("EditFab", EditFab);
    app.component("InlineMarkdownEditor", InlineMarkdownEditor);
    app.component("KnowledgeGraph", KnowledgeGraph);
    app.component("RAGSearch", RAGSearch);

    // ========== Register Layout ==========
    app.component("Breadcrumb", Breadcrumb);
    app.component("GlobalSidebar", GlobalSidebar);
    app.component("TocSidebar", TocSidebar);
    app.component("TocFab", TocFab);

    // ========== Register Home Components ==========
    app.component("HomePortal", HomePortal);
    app.component("SectionHub", SectionHub);
    app.component("SectionHero", SectionHero);

    // ========== Register UI ==========
    app.component("AnimatedContainer", AnimatedContainer);
    app.component("AnimatedButton", AnimatedButton);

    // ========== Register Dashboards ==========
    app.component("AboutProfile", AboutProfile);

    // ========== Register Legacy ==========
    app.component("ControlCenter", ControlCenter);
    app.component("FullScreenPanel", FullScreenPanel);

    // ========== Register Section Components ==========
    app.component("ArticleCards", ArticleCards);
    app.component("SectionIndex", SectionIndex);
  },
} satisfies Theme;
