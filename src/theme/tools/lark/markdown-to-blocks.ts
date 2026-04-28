/**
 * Markdown → 飞书 Docx Blocks 转换器(鲁棒版)
 *
 * 支持：
 *   块级：标题(1-9)、无序/有序列表、任务列表、代码块、引用(嵌套)、分割线、图片、表格(降级为文本)、公式块
 *   行内：粗体(嵌套)、斜体(嵌套)、删除线、行内代码、链接(嵌套)、公式、普通文本
 *
 * 鲁棒特性：
 *   - 嵌套格式解析：**粗体*斜体*粗体**、[*斜体链接*](url)
 *   - 输入清洗：去除 BOM / 零宽空格 / 零宽连接符
 *   - 容错回退：格式标记不闭合时自动回退为普通文本
 *   - 碎片合并：相邻纯文本 text_run 自动合并
 *   - 块级容错：解析失败不抛异常，降级为普通段落
 */

export interface TextElement {
  text_run?: {
    content: string
    text_element_style?: {
      bold?: boolean
      italic?: boolean
      strikethrough?: boolean
      underline?: boolean
      inline_code?: boolean
      link?: { url: string }
    }
  }
  equation?: {
    content: string
    text_element_style?: {}
  }
}

// ============================================================
// 公共常量
// ============================================================

/** 零宽字符正则 */
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF\u2060]/g

/** 标题正则：# 后必须有空格，支持尾部 # */
const HEADING_RE = /^(#{1,9})\s+(.+?)(?:\s+#*)?$/

/** 无序列表 */
const BULLET_RE = /^(\s*)-\s+(.+)$/

/** 有序列表 */
const ORDERED_RE = /^(\s*)(\d+)\.\s+(.+)$/

/** 任务列表 */
const TODO_RE = /^(\s*)-\s+\[([ xX])\]\s+(.+)$/

/** 分割线：---、***、___、* * * */
const DIVIDER_RE = /^(---+|\*\*\*|___|\*\s+\*\s+\*)\s*$/

/** 代码块起始 */
const CODE_FENCE_RE = /^```(.*)$/

// ============================================================
// 入口函数
// ============================================================

export function markdownToBlocks(markdown: string): any[] {
  // 1. 输入清洗
  const cleaned = cleanInput(markdown)
  // 2. 解析
  const blocks = parseBlocks(cleaned)
  // 3. 合并相邻纯文本碎片
  return blocks.map(mergeBlockTextElements)
}

// ============================================================
// 输入清洗
// ============================================================

function cleanInput(text: string): string {
  return text
    .replace(/^\uFEFF/, '') // 去除 BOM
    .replace(ZERO_WIDTH_CHARS, '') // 去除零宽字符
    .replace(/\r\n/g, '\n') // 统一换行符
    .replace(/\r/g, '\n')
}

// ============================================================
// 块级解析
// ============================================================

function parseBlocks(markdown: string): any[] {
  const lines = markdown.split('\n')
  const blocks: any[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 空行
    if (!line || line.trim() === '') {
      i++
      continue
    }

    try {
      const result = parseBlock(lines, i)
      blocks.push(result.block)
      i = result.nextIndex
    } catch {
      // 容错：解析失败降级为普通段落
      const paraLines = [line]
      i++
      while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
        paraLines.push(lines[i])
        i++
      }
      blocks.push({
        block_type: 2,
        text: { elements: [{ text_run: { content: paraLines.join('\n') } }] },
      })
    }
  }

  return blocks
}

function parseBlock(lines: string[], i: number): { block: any; nextIndex: number } {
  const line = lines[i]

  // --- 块级公式 $$...$$(支持多行和单行) ---
  if (line === '$$') {
    // 多行: $$\n...\n$$
    const formulaLines: string[] = []
    i++
    while (i < lines.length && lines[i] !== '$$') {
      formulaLines.push(lines[i])
      i++
    }
    return {
      block: {
        block_type: 2,
        text: {
          elements: [{ equation: { content: formulaLines.join('\n') } }],
        },
      },
      nextIndex: i + 1,
    }
  }

  // 单行块级公式: $$\nabla J(\theta) = ...$$
  const singleLineEqMatch = line.match(/^\$\$(.+)\$\$$/)
  if (singleLineEqMatch) {
    return {
      block: {
        block_type: 2,
        text: {
          elements: [{ equation: { content: singleLineEqMatch[1] } }],
        },
      },
      nextIndex: i + 1,
    }
  }

  // --- 代码块 ---
  const codeMatch = line.match(CODE_FENCE_RE)
  if (codeMatch) {
    const lang = codeMatch[1].trim()
    const codeLines: string[] = []
    i++
    while (i < lines.length && !CODE_FENCE_RE.test(lines[i])) {
      codeLines.push(lines[i])
      i++
    }
    const block: any = {
      block_type: 14,
      code: { elements: [{ text_run: { content: codeLines.join('\n') } }] },
    }
    if (lang) block.code.style = { language: mapCodeLanguage(lang) }
    return { block, nextIndex: i + 1 }
  }

  // --- 标题 ---
  const headingMatch = line.match(HEADING_RE)
  if (headingMatch) {
    const level = Math.min(headingMatch[1].length, 9)
    return {
      block: {
        block_type: 2 + level,
        [`heading${level}`]: {
          elements: parseInlineElements(headingMatch[2]),
        },
      },
      nextIndex: i + 1,
    }
  }

  // --- 任务列表 ---
  const todoMatch = line.match(TODO_RE)
  if (todoMatch) {
    return {
      block: {
        block_type: 17,
        todo: {
          elements: parseInlineElements(todoMatch[3]),
          style: { done: todoMatch[2].toLowerCase() === 'x' },
        },
      },
      nextIndex: i + 1,
    }
  }

  // --- 无序列表 ---
  const bulletMatch = line.match(BULLET_RE)
  if (bulletMatch) {
    return {
      block: {
        block_type: 12,
        bullet: { elements: parseInlineElements(bulletMatch[2]) },
      },
      nextIndex: i + 1,
    }
  }

  // --- 有序列表 ---
  const orderedMatch = line.match(ORDERED_RE)
  if (orderedMatch) {
    return {
      block: {
        block_type: 13,
        ordered: { elements: parseInlineElements(orderedMatch[3]) },
      },
      nextIndex: i + 1,
    }
  }

  // --- 引用块(支持嵌套)---
  if (line.startsWith('>')) {
    const quoteLines: string[] = []
    while (i < lines.length && lines[i].startsWith('>')) {
      // 去除引用标记，保留嵌套层级用于缩进感知(简单实现：只去一层)
      const stripped = lines[i].replace(/^>\s?/, '')
      quoteLines.push(stripped)
      i++
    }
    return {
      block: {
        block_type: 15,
        quote: { elements: parseInlineElements(quoteLines.join('\n')) },
      },
      nextIndex: i,
    }
  }

  // --- 分割线 ---
  if (DIVIDER_RE.test(line)) {
    return { block: { block_type: 22, divider: {} }, nextIndex: i + 1 }
  }

  // --- 表格 ---
  if (isTableLine(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
    const tableLines: string[] = [line]
    i++
    while (i < lines.length && isTableLine(lines[i])) {
      tableLines.push(lines[i])
      i++
    }
    const parsed = parseMarkdownTable(tableLines)
    if (parsed) {
      return { block: parsed, nextIndex: i }
    }
    // 解析失败降级为文本
    return {
      block: {
        block_type: 2,
        text: { elements: [{ text_run: { content: tableLines.join('\n') } }] },
      },
      nextIndex: i,
    }
  }

  // --- 普通段落 ---
  const paraLines: string[] = [line]
  i++
  while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
    paraLines.push(lines[i])
    i++
  }
  return {
    block: {
      block_type: 2,
      text: { elements: parseInlineElements(paraLines.join('\n')) },
    },
    nextIndex: i,
  }
}

/** 判断一行是否是块级元素的开头 */
function isBlockStart(line: string): boolean {
  return (
    line === '$$' ||
    /^\$\$.+\$\$$/.test(line) ||
    HEADING_RE.test(line) ||
    CODE_FENCE_RE.test(line) ||
    TODO_RE.test(line) ||
    BULLET_RE.test(line) ||
    ORDERED_RE.test(line) ||
    line.startsWith('>') ||
    DIVIDER_RE.test(line) ||
    isTableLine(line)
  )
}

/** 表格行：以 | 开头或结尾 */
function isTableLine(line: string): boolean {
  return /^\s*\|/.test(line) || /\|\s*$/.test(line)
}

/** 表格分隔行：|---|---| */
function isTableDivider(line: string): boolean {
  return /^\s*\|?[-:\|\s]+\|?\s*$/.test(line)
}

/** 解析 Markdown 表格为飞书 table block
 *  返回结构包含 _cell_contents(TextElement[][]，行优先)，
 *  由后端拆分为：创建 table + POST text children 到每个 cell
 */
function parseMarkdownTable(lines: string[]): any | null {
  if (lines.length < 2) return null

  const headerCells = splitTableCells(lines[0])
  const colCount = headerCells.length
  if (colCount === 0) return null

  // 第二行必须是分隔行
  if (!isTableDivider(lines[1])) return null

  const cellContents: TextElement[][] = []

  // 表头行
  for (const cell of headerCells) {
    cellContents.push(parseInlineElements(cell))
  }

  // 数据行
  for (let r = 2; r < lines.length; r++) {
    const cells = splitTableCells(lines[r])
    for (let c = 0; c < colCount; c++) {
      const cellContent = cells[c] || ''
      cellContents.push(parseInlineElements(cellContent))
    }
  }

  const rowCount = lines.length - 1 // 去掉分隔行

  return {
    block_type: 31,
    table: {
      property: {
        column_size: colCount,
        row_size: rowCount,
      },
    },
    _cell_contents: cellContents,
  }
}

/** 按 | 分割表格行，去除首尾空格 */
function splitTableCells(line: string): string[] {
  let content = line.trim()
  if (content.startsWith('|')) content = content.slice(1)
  if (content.endsWith('|')) content = content.slice(0, -1)
  return content.split('|').map((s) => s.trim())
}

// ============================================================
// 行内解析(递归下降，支持嵌套)
// ============================================================

function parseInlineElements(text: string): TextElement[] {
  return parseInline(text, 0)
}

/** 递归下降解析行内格式
 * 优先级：Link > Code > Bold > Italic > Strikethrough > PlainText
 */
function parseInline(text: string, start: number): TextElement[] {
  const elements: TextElement[] = []
  let i = start

  while (i < text.length) {
    // 优先级 1: Link [text](url)
    const link = tryParseLink(text, i)
    if (link) {
      const inner = parseInline(link.innerText, 0)
      elements.push(...applyStyle(inner, 'link', link.url))
      i = link.endPos
      continue
    }

    // 优先级 2: Code `text`(内部不解析)
    const code = tryParseCode(text, i)
    if (code) {
      elements.push({
        text_run: {
          content: code.text,
          text_element_style: { inline_code: true },
        },
      })
      i = code.endPos
      continue
    }

    // 优先级 3: Bold **text**
    const bold = tryParseBold(text, i)
    if (bold) {
      const inner = parseInline(bold.innerText, 0)
      elements.push(...applyStyle(inner, 'bold'))
      i = bold.endPos
      continue
    }

    // 优先级 4: Italic *text*(避免匹配 ** 内部的单个 *)
    const italic = tryParseItalic(text, i)
    if (italic) {
      const inner = parseInline(italic.innerText, 0)
      elements.push(...applyStyle(inner, 'italic'))
      i = italic.endPos
      continue
    }

    // 优先级 5: Strikethrough ~~text~~
    const strike = tryParseStrikethrough(text, i)
    if (strike) {
      const inner = parseInline(strike.innerText, 0)
      elements.push(...applyStyle(inner, 'strikethrough'))
      i = strike.endPos
      continue
    }

    // 优先级 6: 行内公式 $...$(避免匹配 $$ 开头的块级公式)
    const eq = tryParseEquation(text, i)
    if (eq) {
      elements.push({ equation: { content: eq.content } })
      i = eq.endPos
      continue
    }

    // 普通文本：收集连续非标记字符
    const plainStart = i
    while (i < text.length && !isInlineMarkerStart(text, i)) {
      i++
    }
    if (i > plainStart) {
      elements.push({
        text_run: { content: text.slice(plainStart, i) },
      })
    } else {
      // 当前位置是标记开头但没匹配成功，当作普通字符
      elements.push({ text_run: { content: text[i] } })
      i++
    }
  }

  return mergePlainText(elements)
}

/** 判断当前位置是否是行内标记的开头 */
function isInlineMarkerStart(text: string, i: number): boolean {
  const ch = text[i]
  return (
    ch === '[' ||
    ch === '`' ||
    ch === '$' ||
    (ch === '*' && text[i + 1] === '*') ||
    (ch === '*' && text[i + 1] !== '*') ||
    (ch === '~' && text[i + 1] === '~')
  )
}

// ----- 行内标记解析器 -----

function tryParseLink(text: string, i: number): { pos: number; innerText: string; url: string; endPos: number } | null {
  if (text[i] !== '[') return null

  // 找匹配的 ]
  let depth = 1
  let j = i + 1
  while (j < text.length && depth > 0) {
    if (text[j] === '\\') { j += 2; continue }
    if (text[j] === '[') depth++
    else if (text[j] === ']') depth--
    j++
  }
  if (depth !== 0) return null
  const closeBracket = j - 1

  // 后面必须紧跟 (
  if (text[j] !== '(') return null

  // 找匹配的 )
  depth = 1
  j++
  while (j < text.length && depth > 0) {
    if (text[j] === '\\') { j += 2; continue }
    if (text[j] === '(') depth++
    else if (text[j] === ')') depth--
    j++
  }
  if (depth !== 0) return null
  const closeParen = j - 1

  return {
    pos: i,
    innerText: text.slice(i + 1, closeBracket),
    url: text.slice(closeBracket + 2, closeParen),
    endPos: j,
  }
}

function tryParseCode(text: string, i: number): { text: string; endPos: number } | null {
  if (text[i] !== '`') return null
  const end = text.indexOf('`', i + 1)
  if (end === -1 || end === i + 1) return null
  return { text: text.slice(i + 1, end), endPos: end + 1 }
}

function tryParseBold(text: string, i: number): { innerText: string; endPos: number } | null {
  if (text.slice(i, i + 2) !== '**') return null
  const end = text.indexOf('**', i + 2)
  if (end === -1 || end === i + 2) return null
  return { innerText: text.slice(i + 2, end), endPos: end + 2 }
}

function tryParseItalic(text: string, i: number): { innerText: string; endPos: number } | null {
  if (text[i] !== '*' || text.slice(i, i + 2) === '**') return null
  const end = text.indexOf('*', i + 1)
  if (end === -1 || end === i + 1 || text.slice(end, end + 2) === '**') return null
  return { innerText: text.slice(i + 1, end), endPos: end + 1 }
}

function tryParseStrikethrough(text: string, i: number): { innerText: string; endPos: number } | null {
  if (text.slice(i, i + 2) !== '~~') return null
  const end = text.indexOf('~~', i + 2)
  if (end === -1 || end === i + 2) return null
  return { innerText: text.slice(i + 2, end), endPos: end + 2 }
}

function tryParseEquation(text: string, i: number): { content: string; endPos: number } | null {
  if (text[i] !== '$') return null

  // 优先匹配 $$...$$(常见于列表项/段落中的块级公式写法)
  if (text.slice(i, i + 2) === '$$') {
    const end = text.indexOf('$$', i + 2)
    if (end !== -1 && end > i + 2) {
      return { content: text.slice(i + 2, end), endPos: end + 2 }
    }
    return null
  }

  // 普通 $...$ 行内公式
  const end = text.indexOf('$', i + 1)
  if (end === -1 || end === i + 1) return null
  return { content: text.slice(i + 1, end), endPos: end + 1 }
}

// ----- 样式应用 -----

function applyStyle(elements: TextElement[], type: string, url?: string): TextElement[] {
  return elements.map((el) => {
    // equation 元素不应用任何样式
    if (el.equation) return el

    const style = { ...(el.text_run!.text_element_style || {}) }
    switch (type) {
      case 'bold':
        style.bold = true
        break
      case 'italic':
        style.italic = true
        break
      case 'strikethrough':
        style.strikethrough = true
        break
      case 'link':
        if (url) style.link = { url }
        break
    }
    return {
      text_run: { content: el.text_run!.content, text_element_style: style },
    }
  })
}

/** 合并相邻的普通文本元素，减少碎片 */
function mergePlainText(elements: TextElement[]): TextElement[] {
  const result: TextElement[] = []
  let current = ''

  for (const el of elements) {
    // 只有无样式的纯 text_run 才参与合并
    if (
      el.text_run &&
      (!el.text_run.text_element_style || Object.keys(el.text_run.text_element_style).length === 0)
    ) {
      current += el.text_run.content
    } else {
      if (current) {
        result.push({ text_run: { content: current } })
        current = ''
      }
      result.push(el)
    }
  }

  if (current) {
    result.push({ text_run: { content: current } })
  }

  return result
}

/** 合并 block 内部的相邻纯 text_run */
function mergeBlockTextElements(block: any): any {
  const blockType = Object.keys(block).find((k) => k !== 'block_type')
  if (!blockType) return block

  const data = block[blockType]
  if (!data || !Array.isArray(data.elements)) return block

  return {
    ...block,
    [blockType]: {
      ...data,
      elements: mergePlainText(data.elements),
    },
  }
}

// ============================================================
// 代码语言映射
// ============================================================

function mapCodeLanguage(lang: string): number {
  const map: Record<string, number> = {
    plaintext: 1,
    abap: 2,
    ada: 3,
    apache: 4,
    apex: 5,
    assembly: 6,
    bash: 7,
    sh: 7,
    shell: 60,
    zsh: 7,
    csharp: 8,
    cs: 8,
    'c#': 8,
    cpp: 9,
    'c++': 9,
    c: 10,
    cobol: 11,
    css: 12,
    coffeescript: 13,
    coffee: 13,
    d: 14,
    dart: 15,
    delphi: 16,
    django: 17,
    dockerfile: 18,
    docker: 18,
    erlang: 19,
    fortran: 20,
    foxpro: 21,
    go: 22,
    golang: 22,
    groovy: 23,
    html: 24,
    htmlbars: 25,
    http: 26,
    haskell: 27,
    json: 28,
    java: 29,
    javascript: 30,
    js: 30,
    jsx: 30,
    julia: 31,
    kotlin: 32,
    latex: 33,
    lisp: 34,
    logo: 35,
    lua: 36,
    matlab: 37,
    makefile: 38,
    markdown: 39,
    md: 39,
    nginx: 40,
    objective: 41,
    objectivec: 41,
    openedgeabl: 42,
    php: 43,
    perl: 44,
    postscript: 45,
    power: 46,
    powershell: 46,
    prolog: 47,
    protobuf: 48,
    python: 49,
    py: 49,
    r: 50,
    rpg: 51,
    ruby: 52,
    rb: 52,
    rust: 53,
    sas: 54,
    scss: 55,
    sql: 56,
    scala: 57,
    scheme: 58,
    scratch: 59,
    swift: 61,
    thrift: 62,
    typescript: 63,
    ts: 63,
    tsx: 63,
    vbscript: 64,
    visual: 65,
    xml: 66,
    yaml: 67,
    yml: 67,
    cmake: 68,
    diff: 69,
    gherkin: 70,
    graphql: 71,
    glsl: 72,
    properties: 73,
    solidity: 74,
    toml: 75,
  }
  return map[lang.toLowerCase()] || 1
}
