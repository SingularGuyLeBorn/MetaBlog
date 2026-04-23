import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import Layout from "./Layout.vue";
import "./style.css";
import "./styles/animations.css";
import "./styles/liquid-glass-theme.css";
import type { Theme } from "vitepress";
import { createPinia } from "pinia";

// ========== Pages ==========
import HomePage from "./components/pages/HomePage.vue";
import PostsPage from "./components/pages/PostsPage.vue";
import KnowledgePage from "./components/pages/KnowledgePage.vue";
import ResourcesPage from "./components/pages/ResourcesPage.vue";
import AboutPage from "./components/pages/AboutPage.vue";
import ChatPage from "./components/pages/ChatPage.vue";

// ========== Features ==========
// Chat
import { ChatLayout } from "./components/ai-chat";

// Editor
import EditFab from "./components/editor/EditFab.vue";

// ========== Shared Components ==========
// Layout
import Breadcrumb from "./components/common/Breadcrumb.vue";
import GlobalSidebar from "./components/common/GlobalSidebar.vue";
import TocSidebar from "./components/common/TocSidebar.vue";
import TocFab from "./components/common/TocFab.vue";

// UI
import AnimatedContainer from "./components/common/AnimatedContainer.vue";
import AnimatedButton from "./components/common/AnimatedButton.vue";

// Home
import HomePortal from "./components/pages/HomePortal.vue";
import SectionHub from "./components/pages/SectionHub.vue";
import SectionHero from "./components/pages/SectionHero.vue";

// KB Features
import InlineMarkdownEditor from "./components/features/InlineMarkdownEditor.vue";
import KnowledgeGraph from "./components/features/KnowledgeGraph.vue";
import RAGSearch from "./components/features/RAGSearch.vue";

// Dashboards
import AboutProfile from "./components/common/AboutProfile.vue";
import { ArticleCards, SectionIndex } from "./components/common";

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
