<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'

const props = defineProps<{
  initialValue?: string
  path?: string
}>()

const emit = defineEmits<{
  (e: 'update:value', value: string): void
  (e: 'save', value: string): void
}>()

const vditor = ref<Vditor | null>(null)
const editorRef = ref<HTMLElement | null>(null)

// Toolbar Actions mapped to Vditor commands
const execCommand = (command: string, value?: string) => {
  if (!vditor.value) return
  
  switch (command) {
    case 'bold':
      vditor.value.insertValue('**' + vditor.value.getSelection() + '**')
      break
    case 'italic':
      vditor.value.insertValue('*' + vditor.value.getSelection() + '*')
      break
    case 'strike':
      vditor.value.insertValue('~~' + vditor.value.getSelection() + '~~')
      break
    case 'quote':
      vditor.value.insertValue('> ' + vditor.value.getSelection())
      break
    case 'inline-code':
      vditor.value.insertValue('`' + vditor.value.getSelection() + '`')
      break
    case 'code':
      vditor.value.insertValue('```\n' + vditor.value.getSelection() + '\n```')
      break
    case 'link':
      vditor.value.insertValue('[' + vditor.value.getSelection() + '](url)')
      break
    case 'table':
      vditor.value.insertValue('| Header | Header |\n| --- | --- |\n| Content | Content |')
      break
    case 'undo':
      // Ported: Vditor handles undo internally but we can trigger it if needed
      // Actually Vditor instance has its own undo manager
      (vditor.value as any).vditor.undo.undo((vditor.value as any).vditor)
      break
    case 'redo':
      (vditor.value as any).vditor.undo.redo((vditor.value as any).vditor)
      break
    case 'h1': vditor.value.insertValue('# ' + vditor.value.getSelection()); break
    case 'h2': vditor.value.insertValue('## ' + vditor.value.getSelection()); break
    case 'h3': vditor.value.insertValue('### ' + vditor.value.getSelection()); break
    default:
      console.warn('Command not implemented:', command)
  }
  vditor.value.focus()
}

onMounted(() => {
  if (!editorRef.value) return

  vditor.value = new Vditor(editorRef.value, {
    height: '100%',
    width: '100%',
    value: props.initialValue || '',
    mode: 'ir',
    toolbar: [], // Disable default toolbar
    outline: {
      enable: true,
      position: 'left' 
    },
    cache: {
      enable: false,
      id: props.path ? `vditor-${props.path}` : undefined
    },
    preview: {
      delay: 500,
      math: { engine: 'KaTeX', inlineDigit: true },
      markdown: { toc: true, mark: true }
    },
    input: (value) => {
      emit('update:value', value)
    },
    keydown: (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        if (vditor.value) emit('save', vditor.value.getValue())
      }
    }
  })
})

onBeforeUnmount(() => {
  if (vditor.value) {
    vditor.value.destroy()
    vditor.value = null
  }
})

watch(() => props.initialValue, (newValue) => {
  if (vditor.value && newValue !== undefined && newValue !== vditor.value.getValue()) {
    if (vditor.value.getValue() === '') {
      vditor.value.setValue(newValue)
    }
  }
})

defineExpose({
  getValue: () => vditor.value?.getValue(),
  setValue: (val: string) => vditor.value?.setValue(val)
})
</script>

<template>
  <div class="editor-wrapper">
    <div class="custom-toolbar">
      <div class="toolbar-group">
        <button class="tool-btn" @click="execCommand('h1')" title="H1">H1</button>
        <button class="tool-btn" @click="execCommand('h2')" title="H2">H2</button>
        <button class="tool-btn" @click="execCommand('h3')" title="H3">H3</button>
      </div>
      <div class="separator"></div>
      <div class="toolbar-group">
        <button class="tool-btn" @click="execCommand('bold')" title="Bold"><b>B</b></button>
        <button class="tool-btn" @click="execCommand('italic')" title="Italic"><i>I</i></button>
        <button class="tool-btn" @click="execCommand('strike')" title="Strike"><s>S</s></button>
      </div>
      <div class="separator"></div>
      <div class="toolbar-group">
        <button class="tool-btn" @click="execCommand('link')" title="Link">🔗</button>
        <button class="tool-btn" @click="execCommand('quote')" title="Quote">引号</button>
        <button class="tool-btn" @click="execCommand('inline-code')" title="Code">代码</button>
        <button class="tool-btn" @click="execCommand('table')" title="Table">表格</button>
      </div>
      <div class="separator"></div>
      <div class="toolbar-group">
        <button class="tool-btn" @click="execCommand('undo')" title="Undo">↺</button>
        <button class="tool-btn" @click="execCommand('redo')" title="Redo">↻</button>
      </div>
    </div>
    <div class="vditor-container" ref="editorRef"></div>
  </div>
</template>

<style scoped>
.editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vp-c-bg);
}

.custom-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.separator {
  width: 1px;
  height: 20px;
  background: var(--vp-c-divider);
  margin: 0 4px;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tool-btn:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-brand);
  border-color: var(--vp-c-divider);
  transform: translateY(-1px);
}

.tool-btn:active {
  transform: translateY(0);
}

.vditor-container {
  flex: 1;
  border: none;
}

/* Deep overrides for Vditor internals to match MetaBlog */
:deep(.vditor) {
  border: none !important;
  background-color: transparent !important;
}

:deep(.vditor-content) {
  background-color: transparent !important;
}

:deep(.vditor-ir) {
  padding: 20px 40px !important;
  background-color: transparent !important;
  color: var(--vp-c-text-1) !important;
  font-family: var(--vp-font-family-base) !important;
}

/* Hide Vditor internal components we don't want */
:deep(.vditor-toolbar) {
  display: none !important;
}

:deep(.vditor-counter) {
  color: var(--vp-c-text-3) !important;
}
</style>
