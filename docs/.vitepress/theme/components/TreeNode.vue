<template>
  <div class="tree-nodes">
    <div
      v-for="item in items"
      :key="item.id || item.link || item.text"
      class="tree-node"
      :class="{ 
        'is-active': isActive(item.link),
        'has-children': item.items 
      }"
    >
      <div 
        class="node-content"
        @click="item.items ? toggle(item.id || item.link!) : $emit('navigate', item.link)"
      >
        <span v-if="item.items" class="toggle-icon">
          {{ isExpanded(item.id || item.link!) ? '−' : '+' }}
        </span>
        <span v-else class="leaf-dot">•</span>
        
        <a 
          v-if="item.link"
          :href="item.link" 
          class="node-link"
          @click.prevent="$emit('navigate', item.link)"
        >
          {{ item.text }}
        </a>
        <span v-else class="node-text">{{ item.text }}</span>
      </div>

      <!-- Recursive Step -->
      <TreeNode
        v-if="item.items && isExpanded(item.id || item.link!)"
        :items="item.items"
        :level="level + 1"
        :active-path="activePath"
        @navigate="$emit('navigate', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  items: any[]
  level: number
  activePath: string
}>()

const emit = defineEmits(['navigate'])

const expandedNodes = ref(new Set<string>())

const isExpanded = (id: string) => expandedNodes.value.has(id)

const toggle = (id: string) => {
  if (!id) return
  if (expandedNodes.value.has(id)) {
    expandedNodes.value.delete(id)
  } else {
    expandedNodes.value.add(id)
  }
}

const isActive = (link?: string) => {
  if (!link) return false
  return props.activePath === link || (link !== '/' && props.activePath.startsWith(link))
}

// Auto expand if descendant is active
onMounted(() => {
    props.items.forEach(item => {
        const nodeId = item.id || item.link
        if (item.items && nodeId) {
            // Check if active path is inside this node (using ID which is the directory path)
            // Or if it matches the link exactly
            if (props.activePath.startsWith(nodeId) || (item.link && props.activePath === item.link)) {
                expandedNodes.value.add(nodeId)
            }
        }
    })
})
</script>

<style scoped>
.tree-nodes {
    border-left: 1px solid var(--vp-c-divider);
    margin-top: 2px;
    padding-left: 12px;
}

.tree-node {
    margin: 2px 0;
}

.node-content {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 0.9rem;
}

.node-content:hover {
    background: var(--vp-c-bg-soft);
}

.is-active > .node-content {
    color: var(--vp-c-brand);
    font-weight: 500;
}

.toggle-icon, .leaf-dot {
    width: 16px;
    text-align: center;
    margin-right: 6px;
    color: var(--vp-c-text-3);
    font-size: 0.8rem;
}

.node-link, .node-text {
    color: var(--vp-c-text-2);
    text-decoration: none;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.is-active .node-link {
    color: var(--vp-c-brand);
}

.node-link:hover {
    color: var(--vp-c-text-1);
}
</style>
