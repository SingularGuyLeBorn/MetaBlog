import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import Layout from "./Layout.vue";
import "./style.css";
import "./shared/styles/animations.css";
import "./shared/styles/liquid-glass-theme.css";
import type { Theme } from "vitepress";
import { createPinia } from "pinia";

// ========== Pages ==========
import HomePage from "./pages/HomePage.vue";
import PostsPage from "./pages/PostsPage.vue";
import KnowledgePage from "./pages/KnowledgePage.vue";
import ResourcesPage from "./pages/ResourcesPage.vue";
import AboutPage from "./pages/AboutPage.vue";
import ChatPage from "./pages/ChatPage.vue";

// ========== Features ==========
// Chat
import { ChatLayout } from "./features/chat";

// Editor
import EditFab from "./features/editor/EditFab.vue";

// ========== Shared Components ==========
// Layout
import Breadcrumb from "./shared/components/Breadcrumb.vue";
import GlobalSidebar from "./shared/components/GlobalSidebar.vue";
import TocSidebar from "./shared/components/TocSidebar.vue";
import TocFab from "./shared/components/TocFab.vue";

// UI
import AnimatedContainer from "./shared/components/AnimatedContainer.vue";
import AnimatedButton from "./shared/components/AnimatedButton.vue";

// Home
import HomePortal from "./pages/HomePortal.vue";
import SectionHub from "./pages/SectionHub.vue";
import SectionHero from "./pages/SectionHero.vue";

// KB Features
import InlineMarkdownEditor from "./features/kb/InlineMarkdownEditor.vue";
import KnowledgeGraph from "./features/kb/KnowledgeGraph.vue";
import RAGSearch from "./features/kb/RAGSearch.vue";

// Dashboards
import AboutProfile from "./shared/components/AboutProfile.vue";

// Legacy
import ControlCenter from "./shared/components/ControlCenter.vue";
import FullScreenPanel from "./shared/components/FullScreenPanel.vue";

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
  },
} satisfies Theme;
