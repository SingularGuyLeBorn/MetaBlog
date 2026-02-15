<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import GlobalPageEditor from './components/features/GlobalPageEditor.vue'
import { useAppStore } from './stores/app'

const { Layout } = DefaultTheme
const { frontmatter } = useData()
const store = useAppStore()
</script>

<template>
  <Layout v-bind="$attrs" :class="{ 'is-editing': store.isEditorOpen }">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <template v-if="name === 'doc-before'">
        <slot name="doc-before" v-bind="slotData" />
        <GlobalPageEditor />
      </template>
      <slot v-else :name="name" v-bind="slotData || {}" />
    </template>
  </Layout>
</template>

<style>
/* Seamless editor transition */
.is-editing .VPDoc .main {
  display: none !important;
}

.is-editing .VPDoc .aside {
  display: none !important;
}

/* Ensure breadcrumbs and header remain visible if needed 
   but hide the main content area to make room for editor
*/
</style>
