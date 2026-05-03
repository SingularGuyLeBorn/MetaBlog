<template>
  <nav class="breadcrumb" v-if="breadcrumbs.length > 0">
    <div class="breadcrumb-inner">
      <span v-for="(crumb, index) in breadcrumbs" :key="index" class="crumb-item">
        <a v-if="crumb.link" :href="crumb.link" class="crumb-link">
          <span class="crumb-text">{{ crumb.title }}</span>
        </a>
        <span v-else class="crumb-text current">{{ crumb.title }}</span>
        <span v-if="index < breadcrumbs.length - 1" class="separator">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
      </span>
    </div>
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
  if (page.value.frontmatter.breadcrumb) {
      return page.value.frontmatter.breadcrumb as Crumb[]
  }

  // Fallback: generate from route path
  const parts = route.path.split('/').filter(Boolean)
  const crumbs: Crumb[] = []
  let path = ''
  
  for (let i = 0; i < parts.length; i++) {
    path += '/' + parts[i]
    const isLast = i === parts.length - 1
    
    // Format the name nicely
    const title = parts[i]
      .split(/[-_]/)
      .map(word => {
        if (!word) return ''
        // Keep numeric prefixes as-is
        if (/^\d+$/.test(word)) return word + ' '
        return word.charAt(0).toUpperCase() + word.slice(1) + ' '
      })
      .join('')
      .trim()
    
    crumbs.push({
      title,
      link: isLast ? undefined : path + '/'
    })
  }
  
  return crumbs
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   Breadcrumb — Star River Style
   ═══════════════════════════════════════════════════════════════ */

.breadcrumb {
  padding: 12px 32px;
  background: #f8f6f3;
  border-bottom: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
}

.breadcrumb-inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

.crumb-item {
  display: flex;
  align-items: center;
}

.crumb-link {
  display: flex;
  align-items: center;
  color: var(--sr-text-muted, #94a3b8);
  text-decoration: none;
  font-size: 13px;
  font-weight: 400;
  padding: 4px 10px;
  border-radius: var(--sr-radius-sm, 6px);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  letter-spacing: 0.01em;
}

.crumb-link:hover {
  color: var(--sr-accent-star, #b8a090);
  background: var(--sr-glass-bg, rgba(255, 255, 255, 0.5));
}

.crumb-text {
  font-size: 13px;
  line-height: 22px;
  font-family: var(--sr-font-primary, 'Inter', sans-serif);
}

.crumb-text.current {
  color: var(--sr-text-primary, #1a1a2e);
  font-weight: 500;
  padding: 4px 10px;
}

.separator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sr-text-tertiary, rgba(0, 0, 0, 0.15));
  padding: 0 2px;
}

.separator svg {
  width: 12px;
  height: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .breadcrumb {
    padding: 10px 16px;
  }
  
  .crumb-text,
  .crumb-link {
    font-size: 12px;
  }
}
</style>
