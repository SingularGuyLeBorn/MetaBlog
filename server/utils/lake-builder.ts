/**
 * =============================================================================
 * 语雀 Lake HTML 构建工具 (lake-builder.ts)
 * =============================================================================
 * 
 * 将 Markdown / 纯文本转换为语雀专用的 Lake HTML 格式。
 * Lake 是语雀自研的富文本格式，其特点是每个块级元素都有唯一的 uID。
 * 
 * 【2024-04-21 修复记录】
 * 1. 表格检测：支持 | :-- | :-- | 等带空格的 Markdown 表格分隔符
 * 2. 公式解析：修复 $$...$$ 被错误拆分为 $...$ 的问题
 * 3. 行间公式：支持跨多行的 $$...$$ 公式块
 * 4. 代码块：改用语雀 Lake 标准 <card name="codeblock"> 格式
 * 5. 图片：改用语雀 Lake 标准 <card name="image"> 格式（基础支持）
 */

/**
 * 简单的 HTML 转义函数
 */
function escape(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 生成 8 位随机 ID
 */
function uid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let res = '';
  for (let i = 0; i < 8; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

/**
 * 编码语雀 Card 标签的 value 属性
 * 格式: data:{urlEncodedJson}
 */
function encodeCardValue(data: Record<string, any>): string {
  const jsonStr = JSON.stringify(data);
  return 'data:' + encodeURIComponent(jsonStr);
}

/**
 * 包装文本为 Lake <span> 元素
 */
function wrapSpan(text: string, options: { bold?: boolean; italic?: boolean; code?: boolean; latex?: boolean } = {}): string {
  if (options.latex) {
    const escaped = escape(text);
    return `<span data-latex="${escaped}">$$${escaped}$$</span>`;
  }

  const u1 = uid();
  const attrs = ` data-lake-id="u${u1}" id="u${u1}"`;

  if (options.code) {
    return `<span${attrs}><code>${escape(text)}</code></span>`;
  }

  const styles: string[] = [];
  if (options.bold) styles.push('font-weight: bold');
  if (options.italic) styles.push('font-style: italic');

  const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
  return `<span${attrs}${styleAttr}>${escape(text)}</span>`;
}

/**
 * 解析行内 Markdown
 */
function parseInline(text: string): string {
  let result = '';
  let i = 0;

  while (i < text.length) {
    // 行内代码 `code`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        result += `<code>${escape(text.substring(i + 1, end))}</code>`;
        i = end + 1;
        continue;
      }
    }

    // 公式 $$latex$$ (行内 display 公式) — 优先匹配
    if (text.startsWith('$$', i)) {
      const end = text.indexOf('$$', i + 2);
      if (end !== -1 && end > i + 2) {
        result += wrapSpan(text.substring(i + 2, end), { latex: true });
        i = end + 2;
        continue;
      }
    }

    // 公式 $latex$ (普通行内公式)
    if (text[i] === '$') {
      const end = text.indexOf('$', i + 1);
      if (end !== -1 && end > i + 1) {
        result += wrapSpan(text.substring(i + 1, end), { latex: true });
        i = end + 1;
        continue;
      }
    }

    // 粗体 **bold**
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        result += wrapSpan(text.substring(i + 2, end), { bold: true });
        i = end + 2;
        continue;
      }
    }

    // 斜体 *italic*
    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1) {
        result += wrapSpan(text.substring(i + 1, end), { italic: true });
        i = end + 1;
        continue;
      }
    }

    result += escape(text[i]);
    i++;
  }

  return result;
}

/**
 * Lake 文档元数据
 */
function lakeMeta(): string {
  return [
    '<meta name="doc-version" content="1" />',
    '<meta name="viewport" content="adapt" />',
    '<meta name="typography" content="classic" />',
    '<meta name="paragraphSpacing" content="relax" />'
  ].join('');
}

export const Lake = {
  h1: (text: string) => {
    const id = uid();
    return `<h1 data-lake-id="${id}" id="${id}">${wrapSpan(text)}</h1>`;
  },

  h2: (text: string) => {
    const id = uid();
    return `<h2 data-lake-id="${id}" id="${id}">${wrapSpan(text)}</h2>`;
  },

  h3: (text: string) => {
    const id = uid();
    return `<h3 data-lake-id="${id}" id="${id}">${wrapSpan(text)}</h3>`;
  },

  p: (text: string, parse = true) => {
    const id = uid();
    const content = parse ? parseInline(text) : escape(text);
    return `<p data-lake-id="${id}" id="${id}">${content}</p>`;
  },

  blockquote: (text: string) => {
    const id = uid();
    return `<blockquote data-lake-id="${id}" id="${id}">${wrapSpan(text)}</blockquote>`;
  },

  ul: (items: string[]) => {
    const id = uid();
    const lis = items.map(item => `<li data-lake-id="u${uid()}" id="u${uid()}">${parseInline(item)}</li>`).join('\n');
    return `<ul data-lake-id="${id}" id="${id}">\n${lis}\n</ul>`;
  },

  ol: (items: string[]) => {
    const id = uid();
    const lis = items.map(item => `<li data-lake-id="u${uid()}" id="u${uid()}">${parseInline(item)}</li>`).join('\n');
    return `<ol data-lake-id="${id}" id="${id}">\n${lis}\n</ol>`;
  },

  /**
   * 代码块 —— 使用语雀 Lake 标准 <card name="codeblock"> 格式
   * 
   * 语雀 Lake 的代码块不是 <pre><code>，而是嵌入的卡片：
   * <card name="codeblock" value="data:%7B%22code%22%3A%22...%22%2C%22mode%22%3A%22python%22%7D"></card>
   */
  code_block: (language: string, code: string) => {
    const data = {
      code,
      mode: language || 'text',
    };
    return `<card name="codeblock" value="${encodeCardValue(data)}"></card>`;
  },

  /**
   * 图片 —— 使用语雀 Lake 标准 <card name="image"> 格式
   */
  image: (src: string, alt: string = '') => {
    const data = {
      src,
      name: alt || 'image.png',
    };
    return `<card name="image" value="${encodeCardValue(data)}"></card>`;
  },

  table: (rows: string[][], options: { header?: string[]; colWidths?: number[] } = {}) => {
    const id = uid();
    const numCols = options.header ? options.header.length : (rows[0]?.length || 0);
    const colWidths = options.colWidths || Array(numCols).fill(150);
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);

    const colgroup = `<colgroup>${colWidths.map(w => `<col width="${w}">`).join('')}</colgroup>`;

    let thead = '';
    if (options.header) {
      const ths = options.header.map(h => {
        const u = uid();
        return `<td data-lake-id="u${u}" id="u${u}"><p data-lake-id="u${uid()}" id="u${uid()}">${wrapSpan(h)}</p></td>`;
      }).join('');
      thead = `<thead><tr data-lake-id="u${uid()}" id="u${uid()}">${ths}</tr></thead>`;
    }

    const trs = rows.map(row => {
      const tds = row.map(cell => {
        const u = uid();
        return `<td data-lake-id="u${u}" id="u${u}"><p data-lake-id="u${uid()}" id="u${uid()}">${wrapSpan(cell)}</p></td>`;
      }).join('');
      return `<tr data-lake-id="u${uid()}" id="u${uid()}">${tds}</tr>`;
    });

    return `<table data-lake-id="${id}" id="${id}" class="lake-table" style="width: ${totalWidth}px">${colgroup}${thead}<tbody>${trs.join('\n')}</tbody></table>`;
  },

  formula: (latex: string, display = false) => {
    const id = uid();
    const content = `<span data-latex="${escape(latex)}">$$${escape(latex)}$$</span>`;
    return display ? `<p data-lake-id="${id}" id="${id}">${content}</p>` : content;
  },

  hr: () => '<hr />',
  br: () => '<br />',

  build: (elements: string[], includeMeta = true) => {
    const body = elements.join('\n');
    const meta = includeMeta ? lakeMeta() : '';
    return `<!doctype lake>${meta}\n${body}`;
  }
};

/**
 * 判断一行是否是 Markdown 表格分隔符
 * 支持: |---|---| 、| :-- | :-- | 、| --- | --- | 等格式
 */
function isTableSeparator(line: string): boolean {
  if (!line.trim().startsWith('|')) return false;
  // 去掉首尾的 |，然后检查每一部分是否是 :-+ 格式
  const inner = line.trim().slice(1, line.trim().endsWith('|') ? -1 : undefined);
  const parts = inner.split('|');
  return parts.every(p => /^\s*:?-+:?\s*$/.test(p));
}

/**
 * 极简 Markdown 转 Lake HTML
 */
export function markdownToLake(md: string): string {
  const elements: string[] = [];
  const lines = md.trim().split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // 代码块
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 跳过结束 ```
      elements.push(Lake.code_block(lang, codeLines.join('\n')));
      continue;
    }

    // 表格 (修复版)
    if (line.startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
      i += 2; // 跳过表头和分隔行
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].split('|').filter(c => c.trim() !== '').map(c => c.trim()));
        i++;
      }
      elements.push(Lake.table(rows, { header }));
      continue;
    }

    // 标题
    if (line.startsWith('# ')) { elements.push(Lake.h1(line.slice(2))); i++; continue; }
    if (line.startsWith('## ')) { elements.push(Lake.h2(line.slice(3))); i++; continue; }
    if (line.startsWith('### ')) { elements.push(Lake.h3(line.slice(4))); i++; continue; }

    // 引用
    if (line.startsWith('> ')) {
      const q: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        q.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(Lake.blockquote(q.join(' ')));
      continue;
    }

    // 无序列表
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(Lake.ul(items));
      continue;
    }

    // 有序列表 (简易支持)
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(Lake.ol(items));
      continue;
    }

    // 公式块 (支持跨多行 $$)
    if (line.startsWith('$$')) {
      if (line.endsWith('$$') && line.length > 4) {
        // 单行公式块
        elements.push(Lake.formula(line.slice(2, -2).trim(), true));
        i++;
        continue;
      } else {
        // 多行公式块
        const formulaLines: string[] = [line.slice(2)];
        i++;
        while (i < lines.length && !lines[i].trim().endsWith('$$')) {
          formulaLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          formulaLines.push(lines[i].trim().slice(0, -2));
          i++;
        }
        elements.push(Lake.formula(formulaLines.join('\n').trim(), true));
        continue;
      }
    }

    // 分割线
    if (line === '---' || line === '***') {
      elements.push(Lake.hr());
      i++;
      continue;
    }

    // 图片 (行内)
    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch && line.trim() === imgMatch[0]) {
      elements.push(Lake.image(imgMatch[2], imgMatch[1]));
      i++;
      continue;
    }

    // 段落
    elements.push(Lake.p(line));
    i++;
  }

  return Lake.build(elements);
}
