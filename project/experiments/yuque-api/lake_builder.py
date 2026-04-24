# =============================================================================
# 语雀 Lake HTML 构建工具 (lake_builder.py)
# =============================================================================
#
# 【重大发现】
# 语雀内部 Web API 创建/更新文档时，必须使用 body_asl 字段保存内容！
# 使用 body 字段会导致内容为空（API 返回成功但 content 长度为 0）。
#
# 正确用法：
#   POST /api/docs  ->  body: { book_id, title, body_asl: lake_html, format: 'lake' }
#   PUT  /api/docs/{id} -> body: { title, body_asl: lake_html, format: 'lake' }
#
# 读取时返回的字段是 content（不是 body 或 body_asl）。
#
# 【作用】
# 将 Markdown / HTML 转换为语雀专用的 Lake HTML 格式。
# Lake 是语雀自研的富文本格式，基于 HTML 但包含自定义标签和属性。
#
# 【Lake HTML 结构特点】
# 1. 文档头：<!doctype lake> + meta 标签
# 2. 每个块级元素有 data-lake-id 和 id 属性（创建时可省略，语雀自动添加）
# 3. 文本内容包裹在 <span> 内
# 4. 表格使用 class="lake-table" 和 <colgroup>
# 5. 代码块使用 <pre><code class="language-xxx">...</code></pre>
# 6. 公式使用 <span data-latex="formula">$$formula$$</span>
#
# 【使用方式】
#   from lake_builder import markdown_to_lake, build_lake_html
#
#   # 方式1：直接构建 Lake HTML
#   html = build_lake_html([
#       h1("文档标题"),
#       p("这是一段普通文本。"),
#       code_block("python", "print('hello')"),
#       table([["A", "B"], ["1", "2"]]),
#   ])
#
#   # 方式2：Markdown 转 Lake HTML
#   html = markdown_to_lake("""
#   # 标题
#   正文内容
#   """)
# =============================================================================

import json
import re
import urllib.parse
import html as html_module


# =============================================================================
# 内部工具函数
# =============================================================================

def _escape(text: str) -> str:
    """HTML 转义"""
    return html_module.escape(text)


def _uid() -> str:
    """生成 Lake ID（简化版，语雀实际使用更复杂的 ID）"""
    import random
    import string
    return ''.join(random.choices(string.ascii_letters + string.digits, k=8))


def _wrap_span(text: str, bold=False, italic=False, code=False, latex=False) -> str:
    """将文本包装为 Lake <span> 元素"""
    if latex:
        return f'<span data-latex="{_escape(text)}">$${_escape(text)}$$</span>'
    
    attrs = f' data-lake-id="u{_uid()}" id="u{_uid()}"'
    
    if code:
        return f'<span{attrs}><code>{_escape(text)}</code></span>'
    
    style = []
    if bold:
        style.append('font-weight: bold')
    if italic:
        style.append('font-style: italic')
    
    if style:
        return f'<span{attrs} style="{"; ".join(style)}">{_escape(text)}</span>'
    return f'<span{attrs}>{_escape(text)}</span>'


def _parse_inline(text: str) -> str:
    """
    解析行内 Markdown 格式：
    - **粗体** → <span style="font-weight: bold">...</span>
    - *斜体* → <span style="font-style: italic">...</span>
    - `代码` → <code>...</code>
    - $公式$ → <span data-latex="...">$$...$$</span>
    - $$公式$$ → <span data-latex="...">$$...$$</span>
    """
    result = []
    i = 0
    while i < len(text):
        # 代码 inline: `xxx`
        if text[i] == '`' and not text[i:i+2] == '``':
            end = text.find('`', i + 1)
            if end != -1:
                code_text = text[i+1:end]
                result.append(f'<code>{_escape(code_text)}</code>')
                i = end + 1
                continue
        
        # 公式: $$xxx$$ (优先匹配)
        if text[i:i+2] == '$$':
            end = text.find('$$', i + 2)
            if end != -1 and end > i + 2:
                latex_text = text[i+2:end]
                result.append(_wrap_span(latex_text, latex=True))
                i = end + 2
                continue
        
        # 公式: $xxx$
        if text[i] == '$' and (i == 0 or text[i-1] != '\\'):
            end = text.find('$', i + 1)
            if end != -1 and end > i + 1:
                latex_text = text[i+1:end]
                result.append(_wrap_span(latex_text, latex=True))
                i = end + 1
                continue
        
        # 粗体: **xxx**
        if text[i:i+2] == '**':
            end = text.find('**', i + 2)
            if end != -1:
                bold_text = text[i+2:end]
                result.append(_wrap_span(bold_text, bold=True))
                i = end + 2
                continue
        
        # 斜体: *xxx* (不是 ** 开头)
        if text[i] == '*' and (i + 1 >= len(text) or text[i+1] != '*'):
            end = text.find('*', i + 1)
            if end != -1:
                italic_text = text[i+1:end]
                result.append(_wrap_span(italic_text, italic=True))
                i = end + 1
                continue
        
        result.append(_escape(text[i]))
        i += 1
    
    return ''.join(result)


# =============================================================================
# Lake HTML 元素构建函数
# =============================================================================

def lake_meta() -> str:
    """Lake 文档元数据标签"""
    return (
        '<meta name="doc-version" content="1" />'
        '<meta name="viewport" content="adapt" />'
        '<meta name="typography" content="classic" />'
        '<meta name="paragraphSpacing" content="relax" />'
    )


def h1(text: str) -> str:
    """一级标题"""
    uid = _uid()
    return f'<h1 data-lake-id="{uid}" id="{uid}">{_wrap_span(text)}</h1>'


def h2(text: str) -> str:
    """二级标题"""
    uid = _uid()
    return f'<h2 data-lake-id="{uid}" id="{uid}">{_wrap_span(text)}</h2>'


def h3(text: str) -> str:
    """三级标题"""
    uid = _uid()
    return f'<h3 data-lake-id="{uid}" id="{uid}">{_wrap_span(text)}</h3>'


def p(text: str, parse_inline=True) -> str:
    """段落"""
    uid = _uid()
    content = _parse_inline(text) if parse_inline else _escape(text)
    return f'<p data-lake-id="{uid}" id="{uid}">{content}</p>'


def blockquote(text: str) -> str:
    """引用块"""
    uid = _uid()
    return f'<blockquote data-lake-id="{uid}" id="{uid}">{_wrap_span(text)}</blockquote>'


def ul(items: list[str]) -> str:
    """无序列表"""
    uid = _uid()
    lis = '\n'.join(
        f'  <li data-lake-id="u{_uid()}" id="u{_uid()}">{_parse_inline(item)}</li>'
        for item in items
    )
    return f'<ul data-lake-id="{uid}" id="{uid}">\n{lis}\n</ul>'


def ol(items: list[str]) -> str:
    """有序列表"""
    uid = _uid()
    lis = '\n'.join(
        f'  <li data-lake-id="u{_uid()}" id="u{_uid()}">{_parse_inline(item)}</li>'
        for item in items
    )
    return f'<ol data-lake-id="{uid}" id="{uid}">\n{lis}\n</ol>'


def _encode_card_value(data: dict) -> str:
    """编码语雀 Card 标签的 value 属性"""
    return "data:" + urllib.parse.quote(json.dumps(data, ensure_ascii=False))


def code_block(language: str, code: str) -> str:
    """
    代码块 —— 使用语雀 Lake 标准 <card name="codeblock"> 格式
    
    语雀 Lake 的代码块不是 <pre><code>，而是嵌入的卡片：
    <card name="codeblock" value="data:%7B%22code%22%3A%22...%22%7D"></card>
    """
    data = {"code": code, "mode": language or "text"}
    return f'<card name="codeblock" value="{_encode_card_value(data)}"></card>'


def table(rows: list[list[str]], header: list[str] = None, col_widths: list[int] = None) -> str:
    """
    表格
    
    参数:
        rows: 数据行，每个元素是一个列表
        header: 表头（可选）
        col_widths: 列宽列表（可选，默认每列150px）
    
    注意：语雀 Lake HTML 表格需要 class="lake-table" 和 <colgroup>
    """
    uid = _uid()
    
    # 计算列数
    num_cols = len(header) if header else (len(rows[0]) if rows else 0)
    
    # 列宽
    if col_widths is None:
        col_widths = [150] * num_cols
    total_width = sum(col_widths)
    
    # colgroup
    cols = ''.join(f'<col width="{w}">' for w in col_widths)
    colgroup = f'<colgroup>{cols}</colgroup>'
    
    # thead
    thead = ''
    if header:
        ths = ''.join(
            f'<td data-lake-id="u{_uid()}" id="u{_uid()}">'
            f'<p data-lake-id="u{_uid()}" id="u{_uid()}">{_wrap_span(h)}</p></td>'
            for h in header
        )
        thead = f'<thead><tr data-lake-id="u{_uid()}" id="u{_uid()}">{ths}</tr></thead>'
    
    # tbody
    trs = []
    for row in rows:
        tds = ''.join(
            f'<td data-lake-id="u{_uid()}" id="u{_uid()}">'
            f'<p data-lake-id="u{_uid()}" id="u{_uid()}">{_wrap_span(cell)}</p></td>'
            for cell in row
        )
        trs.append(f'<tr data-lake-id="u{_uid()}" id="u{_uid()}">{tds}</tr>')
    trs_str = '\n'.join(trs)
    tbody = f'<tbody>\n{trs_str}\n</tbody>'
    
    return (
        f'<table data-lake-id="{uid}" id="{uid}" class="lake-table" style="width: {total_width}px">'
        f'{colgroup}'
        f'{thead}'
        f'{tbody}'
        f'</table>'
    )


def formula(latex: str, display=False) -> str:
    """
    数学公式
    
    参数:
        latex: LaTeX 公式内容
        display: 是否为行间公式（默认行内）
    
    注意：语雀使用 data-latex 属性存储公式源码
    """
    uid = _uid()
    if display:
        return (
            f'<p data-lake-id="{uid}" id="{uid}">'
            f'<span data-latex="{_escape(latex)}">$${_escape(latex)}$$</span>'
            f'</p>'
        )
    return f'<span data-latex="{_escape(latex)}">$${_escape(latex)}$$</span>'


def hr() -> str:
    """水平分割线"""
    return '<hr />'


def br() -> str:
    """换行"""
    return '<br />'


# =============================================================================
# 文档组装函数
# =============================================================================

def build_lake_html(elements: list[str], include_meta=True) -> str:
    """
    将多个 Lake HTML 元素组装为完整的 Lake HTML 文档
    
    参数:
        elements: Lake HTML 元素字符串列表
        include_meta: 是否包含 meta 标签
    
    返回:
        完整的 Lake HTML 字符串，以 <!doctype lake> 开头
    """
    body = '\n'.join(elements)
    meta = lake_meta() if include_meta else ''
    return f'<!doctype lake>{meta}\n{body}'


# =============================================================================
# Markdown 转 Lake HTML
# =============================================================================

def markdown_to_lake(md: str) -> str:
    """
    将 Markdown 文本转换为 Lake HTML
    
    支持的 Markdown 语法：
    - # ## ### 标题
    - **粗体**  *斜体*  `inline code`
    - ```language\ncode\n``` 代码块
    - - 列表项  /  1. 有序列表
    - > 引用
    - | col1 | col2 | 表格
    - $formula$ 行内公式  /  $$formula$$ 行间公式
    - --- 分割线
    
    注意：这是一个简化转换器，不支持所有 Markdown 语法。
    对于复杂文档，建议直接使用 build_lake_html() 手动构建。
    """
    elements = []
    lines = md.strip().split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # 空行
        if not line:
            i += 1
            continue
        
        # 代码块 ```language
        if line.startswith('```'):
            lang = line[3:].strip() or 'text'
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip ```
            elements.append(code_block(lang, '\n'.join(code_lines)))
            continue
        
        # 表格
        def _is_table_separator(line: str) -> bool:
            if not line.strip().startswith('|'):
                return False
            inner = line.strip()[1:]
            if inner.endswith('|'):
                inner = inner[:-1]
            parts = inner.split('|')
            return all(re.match(r'^\s*:?-+:?\s*$', p) for p in parts)
        
        if line.startswith('|') and i + 1 < len(lines) and _is_table_separator(lines[i + 1]):
            # 解析表头（过滤掉首尾空字符串）
            header = [c.strip() for c in line.split('|') if c.strip() != '']
            i += 2  # skip header + separator
            # 解析数据行
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                row = [c.strip() for c in lines[i].split('|') if c.strip() != '']
                rows.append(row)
                i += 1
            elements.append(table(rows, header=header))
            continue
        
        # 标题
        if line.startswith('# '):
            elements.append(h1(line[2:].strip()))
            i += 1
            continue
        if line.startswith('## '):
            elements.append(h2(line[3:].strip()))
            i += 1
            continue
        if line.startswith('### '):
            elements.append(h3(line[4:].strip()))
            i += 1
            continue
        
        # 引用
        if line.startswith('> '):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith('> '):
                quote_lines.append(lines[i].strip()[2:])
                i += 1
            elements.append(blockquote(' '.join(quote_lines)))
            continue
        
        # 无序列表
        if line.startswith('- ') or line.startswith('* '):
            items = []
            while i < len(lines) and (lines[i].strip().startswith('- ') or lines[i].strip().startswith('* ')):
                items.append(lines[i].strip()[2:])
                i += 1
            elements.append(ul(items))
            continue
        
        # 有序列表
        if re.match(r'^\d+\.\s', line):
            items = []
            while i < len(lines) and re.match(r'^\d+\.\s', lines[i].strip()):
                items.append(re.sub(r'^\d+\.\s', '', lines[i].strip()))
                i += 1
            elements.append(ol(items))
            continue
        
        # 分割线
        if line == '---' or line == '***':
            elements.append(hr())
            i += 1
            continue
        
        # 行间公式 $$...$$（支持多行）
        if line.startswith('$$'):
            if line.endswith('$$') and len(line) > 4:
                latex = line[2:-2].strip()
                elements.append(formula(latex, display=True))
                i += 1
                continue
            else:
                formula_lines = [line[2:]]
                i += 1
                while i < len(lines) and not lines[i].strip().endswith('$$'):
                    formula_lines.append(lines[i])
                    i += 1
                if i < len(lines):
                    formula_lines.append(lines[i].strip()[:-2])
                    i += 1
                elements.append(formula('\n'.join(formula_lines).strip(), display=True))
                continue
        
        # 普通段落
        elements.append(p(line))
        i += 1
    
    return build_lake_html(elements)


# =============================================================================
# 便捷函数：快速构建常用 Lake HTML
# =============================================================================

def lake_doc(title: str, sections: list[tuple[str, list]]) -> str:
    """
    快速构建一个结构化 Lake HTML 文档
    
    参数:
        title: 文档标题
        sections: [(section_title, elements), ...]
                  elements 可以是字符串列表或单个字符串
    
    示例:
        lake_doc("测试文档", [
            ("概述", ["这是概述内容。"]),
            ("详情", ["详情内容1", "详情内容2"]),
        ])
    """
    elements = [h1(title)]
    for section_title, items in sections:
        elements.append(h2(section_title))
        for item in items:
            if isinstance(item, str):
                elements.append(p(item))
            else:
                elements.append(item)
    return build_lake_html(elements)


# =============================================================================
# 自测
# =============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("Lake HTML 构建工具 - 自测")
    print("=" * 60)
    
    # 测试1：基本元素
    print("\n[测试1] 基本元素:")
    print(build_lake_html([
        h1("文档标题"),
        p("普通段落，支持**粗体**和*斜体*。"),
        h2("二级标题"),
        ul(["列表项1", "列表项2", "列表项3"]),
    ]))
    
    # 测试2：代码块
    print("\n[测试2] 代码块:")
    print(code_block("python", "def hello():\n    print('world')"))
    
    # 测试3：表格
    print("\n[测试3] 表格:")
    print(table(
        [["A1", "B1"], ["A2", "B2"]],
        header=["列A", "列B"],
        col_widths=[200, 200]
    ))
    
    # 测试4：公式
    print("\n[测试4] 公式:")
    print(formula("E = mc^2", display=True))
    
    # 测试5：Markdown 转 Lake
    print("\n[测试5] Markdown 转 Lake:")
    md = """
# 测试文档

这是**粗体**和*斜体*。

```python
print("hello")
```

| 姓名 | 年龄 |
|------|------|
| 张三 | 25 |
| 李四 | 30 |

$E = mc^2$

- 项目1
- 项目2

> 这是一段引用
"""
    print(markdown_to_lake(md))
    
    print("\n" + "=" * 60)
    print("自测完成")
    print("=" * 60)
