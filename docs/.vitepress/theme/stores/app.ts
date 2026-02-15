import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const isEditorOpen = ref(false)
  const isEditing = ref(false)
  const currentFilePath = ref('')
  
  function toggleEditor(path?: string) {
    if (path) {
      currentFilePath.value = path
    }
    isEditorOpen.value = !isEditorOpen.value
  }

  function setEditing(status: boolean) {
    isEditing.value = status
  }

  return {
    isEditorOpen,
    isEditing,
    currentFilePath,
    toggleEditor,
    setEditing
  }
})
