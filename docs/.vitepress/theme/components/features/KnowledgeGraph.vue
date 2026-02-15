<script setup lang="ts">
import { onMounted, ref, onBeforeUnmount } from 'vue'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import { useData, useRouter } from 'vitepress'

cytoscape.use(dagre)

const cyContainer = ref<HTMLElement | null>(null)
const cy = ref<cytoscape.Core | null>(null)
const { page } = useData()
const router = useRouter()

// Calculate graph data from frontmatter
const generateGraphVideo = () => {
  const links = page.value.frontmatter.wikiLinks || []
  const currentTitle = page.value.title
  
  const elements: any[] = [
    { data: { id: 'current', label: currentTitle, type: 'current' } }
  ]

  links.forEach((link: any, index: number) => {
    elements.push({ data: { id: `node-${index}`, label: link.text || link.link, link: link.link } })
    elements.push({ data: { source: 'current', target: `node-${index}` } })
  })
  
  return elements
}

onMounted(() => {
  if (!cyContainer.value) return

  cy.value = cytoscape({
    container: cyContainer.value,
    elements: generateGraphVideo(),
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'label': 'data(label)',
          'color': '#fff',
          'text-valign': 'center',
          'text-halign': 'center',
          'width': 'label',
          'padding': '10px'
        }
      },
      {
        selector: 'node[type="current"]',
        style: {
          'background-color': '#a7f069',
          'color': '#000',
          'font-weight': 'bold'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#ccc',
          'target-arrow-color': '#ccc',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier'
        }
      }
    ],
    layout: {
      name: 'dagre',
      rankDir: 'LR'
    }
  })

  cy.value.on('tap', 'node', function(evt){
    const node = evt.target;
    const link = node.data('link');
    if(link){
       // Navigate to the link
       // router.go(`/posts/${link}`) // VitePress router might function differently in components
       window.location.href = `/posts/${link}`
    }
  });
})

onBeforeUnmount(() => {
  if (cy.value) {
    cy.value.destroy()
  }
})
</script>

<template>
  <div class="knowledge-graph-container" ref="cyContainer"></div>
</template>

<style scoped>
.knowledge-graph-container {
  width: 100%;
  height: 300px;
  background: rgba(255,255,255,0.02);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
}
</style>
