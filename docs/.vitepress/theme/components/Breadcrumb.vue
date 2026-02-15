<template>
  <nav class="breadcrumb" v-if="breadcrumbs.length > 0">
    <span v-for="(crumb, index) in breadcrumbs" :key="index" class="crumb-item">
      <a v-if="crumb.link" :href="crumb.link" class="crumb-link">{{ crumb.title }}</a>
      <span v-else class="crumb-text">{{ crumb.title }}</span>
      <span v-if="index < breadcrumbs.length - 1" class="separator">/</span>
    </span>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useData } from 'vitepress'
import { computed } from 'vue'

const route = useRoute()
const { page } = useData()

interface Crumb {
    title: string;
    link?: string;
}

const breadcrumbs = computed(() => {
  // Use frontmatter breadcrumb if injected by config.ts 'transformPageData'
  // But since we are client side, we might rely on route path too.
  // The user proposed injecting it via transformPageData.
  // If so, it would be in `page.value.frontmatter.breadcrumb`.
  
  if (page.value.frontmatter.breadcrumb) {
      return page.value.frontmatter.breadcrumb as Crumb[]
  }

  // Fallback client-side generation (simplified)
  // This is less accurate because we don't know file system existence client-side easily
  // without the heavy logic.
  // But let's assume the user config updates will handle the injection.
  return []
})
</script>

<style scoped>
.breadcrumb {
  padding: 12px 24px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.crumb-link {
    color: var(--vp-c-text-1);
    text-decoration: none;
}

.crumb-link:hover {
    color: var(--vp-c-brand);
    text-decoration: underline;
}

.separator {
    margin: 0 8px;
    color: var(--vp-c-text-3);
}
</style>
