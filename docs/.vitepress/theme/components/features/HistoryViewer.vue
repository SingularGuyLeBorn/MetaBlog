<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as Diff from 'diff'

const history = ref<any[]>([])
const selectedCommit = ref<any>(null)
const diffHtml = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/api/git/log')
    if (res.ok) {
      history.value = await res.json()
    } else {
      console.error('Failed to fetch history')
    }
  } catch (e) {
    console.error('Error loading history:', e)
  }
})

function viewDiff(commit: any) {
  selectedCommit.value = commit
  // Mock diff
  const oldText = 'Hello World'
  const newText = 'Hello Vue World'
  const diff = Diff.diffWords(oldText, newText)
  
  diffHtml.value = diff.map(part => {
    const color = part.added ? 'green' : part.removed ? 'red' : 'grey'
    return `<span style="color: ${color}">${part.value}</span>`
  }).join('')
}
</script>

<template>
  <div class="history-viewer">
    <div class="history-list">
      <h3>History</h3>
      <ul>
        <li v-for="commit in history" :key="commit.hash" @click="viewDiff(commit)">
          <span class="hash">{{ commit.hash.substring(0,7) }}</span>
          <span class="message">{{ commit.message }}</span>
          <span class="date">{{ commit.date }}</span>
        </li>
      </ul>
    </div>
    <div class="diff-view" v-if="selectedCommit">
      <h3>Diff: {{ selectedCommit.hash }}</h3>
      <div class="diff-content" v-html="diffHtml"></div>
    </div>
  </div>
</template>

<style scoped>
.history-viewer {
  display: flex;
  gap: 20px;
  height: 400px;
}

.history-list {
  width: 300px;
  border-right: 1px solid rgba(255,255,255,0.1);
  overflow-y: auto;
}

.history-list li {
  padding: 8px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.history-list li:hover {
  background: rgba(255,255,255,0.05);
}

.diff-view {
  flex: 1;
  padding: 10px;
  background: rgba(0,0,0,0.3);
  font-family: monospace;
}
</style>
