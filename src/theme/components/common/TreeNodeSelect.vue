<script setup lang="ts">
const props = defineProps<{
  nodes: any[]
  selectedPaths: Set<string>
  expandedPaths: Set<string>
  level?: number
}>()

const emit = defineEmits<{
  'toggle-selection': [path: string, isFile: boolean]
  'toggle-expand': [path: string]
}>()

const isFile = (node: any) => node.type === 'article'
const isSelected = (path: string) => props.selectedPaths.has(path)
const isExpanded = (path: string) => props.expandedPaths.has(path)
</script>

<template>
  <div class="tree-nodes">
    <div
      v-for="node in nodes"
      :key="node.path"
      class="tree-node"
      :style="{ paddingLeft: `${(level || 0) * 20}px` }"
    >
      <div
        :class="['node-row', { 'is-file': isFile(node), 'is-selected': isSelected(node.path) }]"
        @click="emit('toggle-selection', node.path, isFile(node))"
      >
        <span
          v-if="node.children && node.children.length > 0"
          :class="['expand-btn', { expanded: isExpanded(node.path) }]"
          @click.stop="emit('toggle-expand', node.path)"
        >
          ▶
        </span>
        <span v-else class="expand-placeholder"></span>
        
        <span :class="['checkbox', { checked: isSelected(node.path) }]">
          {{ isSelected(node.path) ? '☑' : '☐' }}
        </span>
        
        <span class="node-icon">{{ isFile(node) ? '📄' : '📁' }}</span>
        
        <span class="node-name">{{ node.displayName || node.title || node.name }}</span>
      </div>
      
      <TreeNodeSelect
        v-if="node.children && node.children.length > 0 && isExpanded(node.path)"
        :nodes="node.children"
        :selected-paths="selectedPaths"
        :expanded-paths="expandedPaths"
        :level="(level || 0) + 1"
        @toggle-selection="(p, f) => emit('toggle-selection', p, f)"
        @toggle-expand="(p) => emit('toggle-expand', p)"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  margin-bottom: 2px;
}

.node-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.node-row:hover {
  background: #f3f4f6;
}

.node-row.is-selected {
  background: #eff6ff;
}

.expand-btn {
  width: 16px;
  font-size: 12px;
  color: #9ca3af;
  transition: transform 0.2s;
  cursor: pointer;
}

.expand-btn.expanded {
  transform: rotate(90deg);
}

.expand-placeholder {
  width: 16px;
}

.checkbox {
  font-size: 14px;
  color: #d1d5db;
}

.checkbox.checked {
  color: #1677ff;
}

.node-icon {
  font-size: 14px;
  color: #6b7280;
}

.node-name {
  font-size: 14px;
  color: #374151;
}

.node-row.is-selected .node-name {
  color: #1677ff;
  font-weight: 500;
}
</style>
