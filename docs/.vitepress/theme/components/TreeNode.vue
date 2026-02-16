<template>
  <div class="tree-node-wrapper">
    <!-- Node Content -->
    <div 
      class="node-row"
      :class="{ 
        'is-active': isExactActive,
        'has-children': hasChildren,
        'is-expanded': isExpanded
      }"
      :style="{ paddingLeft: (level * 12 + 8) + 'px' }"
      tabindex="-1"
      @click="handleClick"
      @keydown.enter.prevent="handleClick"
    >
      <!-- Toggle Button -->
      <span 
        v-if="hasChildren" 
        class="toggle-btn"
        :class="{ 'is-expanded': isExpanded }"
        @click.stop="toggle"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </span>
      <span v-else class="toggle-placeholder"></span>
      
      <!-- Icon -->
      <span class="node-icon" :class="{ 'is-folder': hasChildren, 'is-leaf': !hasChildren }">
        <svg v-if="hasChildren" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </span>
      
      <!-- Title -->
      <a 
        v-if="item.link"
        :href="item.link" 
        class="node-title"
        @click.prevent.stop="$emit('navigate', item.link)"
      >
        {{ item.text }}
      </a>
      <span v-else class="node-title no-link">{{ item.text }}</span>
    </div>

    <!-- Children -->
    <Transition name="expand">
      <div 
        v-if="hasChildren && isExpanded" 
        class="node-children"
      >
        <TreeNode
          v-for="(child, index) in item.items"
          :key="child.id || child.link || index"
          :item="child"
          :level="level + 1"
          :active-path="activePath"
          :expanded-ids="expandedIds"
          @navigate="$emit('navigate', $event)"
          @toggle="$emit('toggle', $event)"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  item: any
  level: number
  activePath: string
  expandedIds: Set<string>
}>()

const emit = defineEmits(['navigate', 'toggle'])

const itemId = computed(() => props.item.id || props.item.link)
const hasChildren = computed(() => props.item.items && props.item.items.length > 0)
const isExpanded = computed(() => itemId.value ? props.expandedIds.has(itemId.value) : false)

// STRICT SINGLE-SELECT: Only exact match is active
// Parent nodes should NOT be active when child is selected
const isExactActive = computed(() => {
  if (!props.item.link) return false
  // Remove trailing slashes for comparison
  const itemPath = props.item.link.replace(/\/$/, '')
  const currentPath = props.activePath.replace(/\/$/, '')
  return currentPath === itemPath
})

const toggle = () => {
  if (itemId.value) {
    emit('toggle', itemId.value)
  }
}

const handleClick = () => {
  if (hasChildren.value) {
    toggle()
  } else if (props.item.link) {
    emit('navigate', props.item.link)
  }
}
</script>

<style scoped>
.tree-node-wrapper {
  width: 100%;
}

.node-row {
  display: flex;
  align-items: center;
  padding: 5px 8px;
  margin: 1px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 200ms ease, color 200ms ease;
  user-select: none;
  position: relative;
}

.node-row:focus {
  outline: 2px solid var(--vp-c-brand, #1677ff);
  outline-offset: -2px;
  background: var(--vp-c-bg-soft, #f5f5f5);
}

.node-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: transparent;
  border-radius: 0 2px 2px 0;
  transition: background 0.2s;
}

.node-row:hover {
  background: var(--vp-c-bg-soft, #f0f0f0);
}

/* STRICT ACTIVE STATE: Only exact match gets highlighted */
.node-row.is-active {
  background: var(--vp-c-brand-soft, rgba(22, 119, 255, 0.1));
}

.node-row.is-active::before {
  background: var(--vp-c-brand, #1677ff);
}

.toggle-btn {
  width: 16px;
  height: 16px;
  margin-right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3, #8c8c8c);
  transition: transform 200ms ease;
  cursor: pointer;
  border-radius: 3px;
}

.toggle-btn:hover {
  background: var(--vp-c-divider, #e8e8e8);
}

.toggle-btn svg {
  width: 12px;
  height: 12px;
}

.toggle-btn.is-expanded {
  transform: rotate(90deg);
}

.toggle-placeholder {
  width: 16px;
  margin-right: 2px;
}

.node-icon {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--vp-c-text-3, #bfbfbf);
}

.node-icon svg {
  width: 14px;
  height: 14px;
}

.node-icon.is-folder {
  color: var(--vp-c-warning, #faad14);
}

.node-row.is-active .node-icon.is-leaf {
  color: var(--vp-c-brand, #1677ff);
}

.node-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--vp-c-text-2, #595959);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-title.no-link {
  cursor: default;
}

.node-title:hover {
  color: var(--vp-c-text-1, #262626);
}

/* Active text color */
.node-row.is-active .node-title {
  color: var(--vp-c-brand, #1677ff);
  font-weight: 500;
}

.node-children {
  position: relative;
}

/* Expand Animation */
.expand-enter-active,
.expand-leave-active {
  transition: opacity 200ms ease, max-height 200ms ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 2000px;
}
</style>
