<script setup lang="ts">
import { ref } from 'vue'

const query = ref('')
const results = ref<any[]>([])
const loading = ref(false)

async function search() {
  if (!query.value) return
  loading.value = true
  
  // Mock API call
  setTimeout(() => {
    results.value = [
      { title: 'Understanding Transformers', excerpt: '...attention mechanism is key...' },
      { title: 'PPO vs GRPO', excerpt: '...policy optimization algorithms...' }
    ]
    loading.value = false
  }, 500)
}
</script>

<template>
  <div class="rag-search">
    <div class="search-box">
      <input v-model="query" @keyup.enter="search" placeholder="Ask your knowledge base..." />
      <button @click="search" :disabled="loading">Search</button>
    </div>
    
    <div class="results" v-if="results.length > 0">
      <div v-for="(res, idx) in results" :key="idx" class="result-item">
        <h4>{{ res.title }}</h4>
        <p>{{ res.excerpt }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rag-search {
  padding: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
}

.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 4px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
}

button {
  padding: 8px 16px;
  background: var(--vp-c-brand);
  color: black;
  border-radius: 4px;
  font-weight: bold;
}

.result-item {
  margin-bottom: 12px;
  padding: 10px;
  background: rgba(255,255,255,0.03);
  border-radius: 4px;
}
</style>
