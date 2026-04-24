import { describe, it, expect } from 'vitest'
import { markdownToBlocks } from '../src/theme/tools/lark/markdown-to-blocks'

describe('markdownToBlocks', () => {
  it('parses plain text paragraph', () => {
    const blocks = markdownToBlocks('Hello world')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].block_type).toBe(2)
    expect(blocks[0].text.elements[0].text_run.content).toBe('Hello world')
  })

  it('parses headings 1-3 with inline formatting', () => {
    const blocks = markdownToBlocks('# H1\n## H2 **bold**\n### H3 *italic*')
    expect(blocks).toHaveLength(3)
    expect(blocks[0].block_type).toBe(3)
    expect(blocks[0].heading1.elements[0].text_run.content).toBe('H1')
    expect(blocks[1].block_type).toBe(4)
    expect(blocks[1].heading2.elements[1].text_run.text_element_style.bold).toBe(true)
    expect(blocks[2].block_type).toBe(5)
    expect(blocks[2].heading3.elements[1].text_run.text_element_style.italic).toBe(true)
  })

  it('parses bullet list', () => {
    const blocks = markdownToBlocks('- item 1\n- item 2')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].block_type).toBe(12)
    expect(blocks[0].bullet.elements[0].text_run.content).toBe('item 1')
  })

  it('parses ordered list', () => {
    const blocks = markdownToBlocks('1. first\n2. second')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].block_type).toBe(13)
    expect(blocks[1].ordered.elements[0].text_run.content).toBe('second')
  })

  it('parses todo list', () => {
    const blocks = markdownToBlocks('- [x] done\n- [ ] pending')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].block_type).toBe(17)
    expect(blocks[0].todo.style.done).toBe(true)
    expect(blocks[1].todo.style.done).toBe(false)
  })

  it('parses blockquote', () => {
    const blocks = markdownToBlocks('> quote line')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].block_type).toBe(15)
    expect(blocks[0].quote.elements[0].text_run.content).toBe('quote line')
  })

  it('parses divider', () => {
    const blocks = markdownToBlocks('---')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].block_type).toBe(22)
  })

  it('parses inline formatting in paragraph', () => {
    const blocks = markdownToBlocks('**bold** *italic* ~~strike~~ `code` [link](https://ex.com) $E=mc^2$')
    const els = blocks[0].text.elements
    expect(els.some(e => e.text_run?.text_element_style?.bold)).toBe(true)
    expect(els.some(e => e.text_run?.text_element_style?.italic)).toBe(true)
    expect(els.some(e => e.text_run?.text_element_style?.strikethrough)).toBe(true)
    expect(els.some(e => e.text_run?.text_element_style?.inline_code)).toBe(true)
    expect(els.some(e => e.text_run?.text_element_style?.link?.url === 'https://ex.com')).toBe(true)
    expect(els.some(e => e.equation?.content === 'E=mc^2')).toBe(true)
  })

  it('parses code block with language', () => {
    const blocks = markdownToBlocks('```python\ndef hello():\n    pass\n```')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].block_type).toBe(14)
    expect(blocks[0].code.style.language).toBe(49)
    expect(blocks[0].code.elements[0].text_run.content).toContain('def hello()')
  })

  it('parses block equation', () => {
    const blocks = markdownToBlocks('$$\\int_a^b f(x)dx$$')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].block_type).toBe(2)
    expect(blocks[0].text.elements[0].equation.content).toBe('\\int_a^b f(x)dx')
  })

  it('parses multiline block equation', () => {
    const blocks = markdownToBlocks('$$\n\\sum_{i=1}^n i\n$$')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text.elements[0].equation.content).toBe('\\sum_{i=1}^n i')
  })

  it('parses table', () => {
    const blocks = markdownToBlocks('| A | B |\n|---|---|\n| 1 | 2 |')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].block_type).toBe(31)
    expect(blocks[0].table.property.column_size).toBe(2)
    expect(blocks[0].table.property.row_size).toBe(2)
    expect(blocks[0]._cell_contents).toHaveLength(4)
    expect(blocks[0]._cell_contents[0][0].text_run.content).toBe('A')
  })

  it('merges adjacent plain text runs', () => {
    const blocks = markdownToBlocks('Hello **bold** world')
    const els = blocks[0].text.elements
    // Should be: "Hello " + bold + " world" (3 elements, not 5)
    expect(els).toHaveLength(3)
  })

  it('cleans BOM and zero-width chars', () => {
    const blocks = markdownToBlocks('\uFEFFHello\u200B world')
    expect(blocks[0].text.elements[0].text_run.content).toBe('Hello world')
  })

  it('falls back to plain text on unmatched inline markers', () => {
    const blocks = markdownToBlocks('unclosed **bold')
    expect(blocks[0].block_type).toBe(2)
    expect(blocks[0].text.elements[0].text_run.content).toBe('unclosed **bold')
  })

  it('handles nested italic inside bold', () => {
    const blocks = markdownToBlocks('**bold *italic* bold**')
    const els = blocks[0].text.elements
    expect(els.some(e => e.text_run?.text_element_style?.bold && !e.text_run?.text_element_style?.italic)).toBe(true)
    expect(els.some(e => e.text_run?.text_element_style?.bold && e.text_run?.text_element_style?.italic)).toBe(true)
  })
})
