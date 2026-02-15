<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  sectionType: 'posts' | 'knowledge' | 'resources'
  indexData: any[] // Dynamic data passed from parent or imported
}>()

const title = computed(() => {
  switch (props.sectionType) {
    case 'posts': return '文章列表'
    case 'knowledge': return '知识库'
    case 'resources': return '公开资源'
    default: return 'Section'
  }
})

const subtitle = computed(() => {
   switch (props.sectionType) {
    case 'posts': return '深入的技术文章与思考'
    case 'knowledge': return '系统化的知识体系'
    case 'resources': return '开源项目与工具分享'
    default: return ''
  }
})

const cardIcon = computed(() => {
   switch (props.sectionType) {
    case 'posts': return '📝'
    case 'knowledge': return '📚'
    case 'resources': return '📦'
    default: return '📄'
  }
})

</script>

<template>
  <div class="section-hub">
     <div class="hub-header">
       <h1>{{ title }}</h1>
       <p>{{ subtitle }}</p>
     </div>

     <div class="hub-grid" :class="sectionType">
        <a v-for="item in indexData" :key="item.url" :href="item.url" class="hub-card glass">
           <div class="card-icon">{{ cardIcon }}</div>
           <div class="card-content">
             <h3>{{ item.title }}</h3>
             <p v-if="item.description">{{ item.description }}</p>
             <p v-if="item.excerpt" class="excerpt">{{ item.excerpt }}</p>
             <div v-if="item.date" class="meta">{{ item.date.string }}</div>
             <div v-if="item.tags" class="tags">
               <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span>
             </div>
           </div>
        </a>
     </div>
  </div>
</template>

<style scoped>
.section-hub {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
}

.hub-header {
  text-align: center;
  margin-bottom: 60px;
}

.hub-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 12px;
  background: linear-gradient(120deg, var(--vp-c-brand-dark), var(--vp-c-brand));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hub-header p {
  color: var(--vp-c-text-2);
  font-size: 1.1rem;
}

.hub-grid {
  display: grid;
  gap: 24px;
}

.hub-grid.posts { grid-template-columns: 1fr; } /* List view for posts */
.hub-grid.knowledge, .hub-grid.resources { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }

.hub-card {
  display: flex;
  padding: 24px;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.3s ease;
  text-decoration: none !important;
  color: inherit;
  align-items: flex-start;
  gap: 20px;
}

.hub-card:hover {
  transform: translateY(-3px);
  border-color: var(--vp-c-brand);
  box-shadow: 0 8px 20px rgba(0,0,0,0.05);
}

.card-icon {
  font-size: 2rem;
  background: var(--vp-c-bg-alt);
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.card-content {
  flex-grow: 1;
}

.card-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--vp-c-text-1);
}

.card-content p {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  margin-bottom: 8px;
  line-height: 1.5;
}

.meta {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  margin-top: 8px;
}

.tags {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.tag {
  font-size: 0.75rem;
  padding: 2px 8px;
  background: var(--vp-c-bg-alt);
  border-radius: 10px;
  color: var(--vp-c-text-2);
}
</style>
