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
import { defineAsyncComponent, h } from "vue";
import Layout from "./Layout.vue";
import "./style.css";
import "./styles/animations.css";

// ========== 首屏必需组件（同步加载） ==========
import HomePage from "./components/pages/HomePage.vue";
import Breadcrumb from "./components/common/Breadcrumb.vue";
import GlobalSidebar from "./components/common/GlobalSidebar.vue";
import TocFab from "./components/common/TocFab.vue";
import TocSidebar from "./components/common/TocSidebar.vue";
import { ArticleCards, SectionIndex } from "./components/common";

// ========== 异步加载的大组件 ==========
const AICenterPage = defineAsyncComponent(() => import("./components/pages/AICenterPage.vue"));
const ChatPage = defineAsyncComponent(() => import("./components/pages/ChatPage.vue"));
const AboutPage = defineAsyncComponent(() => import("./components/pages/AboutPage.vue"));
const KnowledgePage = defineAsyncComponent(() => import("./components/pages/KnowledgePage.vue"));
const PostsPage = defineAsyncComponent(() => import("./components/pages/PostsPage.vue"));
const ResourcesPage = defineAsyncComponent(() => import("./components/pages/ResourcesPage.vue"));

const ChatLayout = defineAsyncComponent(() => import("./components/ai-chat/ChatLayout.vue"));
const EditFab = defineAsyncComponent(() => import("./components/editor/EditFab.vue"));
const InlineMarkdownEditor = defineAsyncComponent(() => import("./components/features/InlineMarkdownEditor.vue"));
const KnowledgeGraph = defineAsyncComponent(() => import("./components/features/KnowledgeGraph.vue"));
const RAGSearch = defineAsyncComponent(() => import("./components/features/RAGSearch.vue"));

const HomePortal = defineAsyncComponent(() => import("./components/pages/HomePortal.vue"));
const SectionHero = defineAsyncComponent(() => import("./components/pages/SectionHero.vue"));
const SectionHub = defineAsyncComponent(() => import("./components/pages/SectionHub.vue"));

const AnimatedContainer = defineAsyncComponent(() => import("./components/common/AnimatedContainer.vue"));
const AnimatedButton = defineAsyncComponent(() => import("./components/common/AnimatedButton.vue"));
const AboutProfile = defineAsyncComponent(() => import("./components/common/AboutProfile.vue"));
const FullScreenPanel = defineAsyncComponent(() => import("./components/common/FullScreenPanel.vue"));

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
    app.component("AICenterPage", AICenterPage);

    // ========== Register Legacy ==========
    app.component("FullScreenPanel", FullScreenPanel);

    // ========== Register Section Components ==========
    app.component("ArticleCards", ArticleCards);
    app.component("SectionIndex", SectionIndex);
  },
} satisfies Theme;
