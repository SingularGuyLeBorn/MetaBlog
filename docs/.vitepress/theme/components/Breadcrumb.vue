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
.breadcrumb {
  padding: 16px 32px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.breadcrumb-inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.crumb-item {
  display: flex;
  align-items: center;
}

.crumb-link {
  display: flex;
  align-items: center;
  color: #595959;
  text-decoration: none;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.crumb-link:hover {
  color: #1677ff;
  background: #f0f0f0;
}

.crumb-text {
  font-size: 14px;
  line-height: 22px;
}

.crumb-text.current {
  color: #262626;
  font-weight: 500;
  padding: 4px 8px;
}

.separator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bfbfbf;
  padding: 0 4px;
}

.separator svg {
  width: 14px;
  height: 14px;
}

/* Responsive */
@media (max-width: 768px) {
  .breadcrumb {
    padding: 12px 16px;
  }
  
  .crumb-text,
  .crumb-link {
    font-size: 13px;
  }
}
</style>
