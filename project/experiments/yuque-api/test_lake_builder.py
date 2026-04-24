"""
Lake HTML 构建器单元测试

纯单元测试，无需语雀 API 凭据，也无需网络连接。
覆盖 markdown_to_lake 和各种元素构建函数。
"""

import re
import pytest
from lake_builder import (
    _escape,
    _wrap_span,
    _parse_inline,
    _encode_card_value,
    lake_meta,
    h1, h2, h3,
    p,
    blockquote,
    ul, ol,
    code_block,
    table,
    formula,
    hr, br,
    build_lake_html,
    markdown_to_lake,
    lake_doc,
)


# =============================================================================
# 内部工具函数
# =============================================================================

class TestEscape:
    def test_basic_escaping(self):
        assert _escape("<script>alert('xss')</script>") == "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"

    def test_no_special_chars(self):
        assert _escape("hello world") == "hello world"


class TestWrapSpan:
    def test_plain_text(self):
        result = _wrap_span("hello")
        assert result.startswith('<span')
        assert result.endswith('>hello</span>')

    def test_bold(self):
        result = _wrap_span("bold", bold=True)
        assert 'font-weight: bold' in result
        assert '>bold</span>' in result

    def test_italic(self):
        result = _wrap_span("italic", italic=True)
        assert 'font-style: italic' in result

    def test_bold_italic(self):
        result = _wrap_span("both", bold=True, italic=True)
        assert 'font-weight: bold' in result
        assert 'font-style: italic' in result

    def test_code(self):
        result = _wrap_span("code", code=True)
        assert '<code>code</code>' in result

    def test_latex(self):
        result = _wrap_span("E=mc^2", latex=True)
        assert 'data-latex="E=mc^2"' in result
        assert '$$E=mc^2$$' in result


class TestParseInline:
    def test_plain_text(self):
        assert _parse_inline("hello world") == "hello world"

    def test_bold(self):
        result = _parse_inline("**bold text**")
        assert 'font-weight: bold' in result
        assert 'bold text' in result

    def test_italic(self):
        result = _parse_inline("*italic text*")
        assert 'font-style: italic' in result
        assert 'italic text' in result

    def test_inline_code(self):
        result = _parse_inline("`code snippet`")
        assert '<code>code snippet</code>' in result

    def test_inline_latex_single_dollar(self):
        result = _parse_inline("$E=mc^2$")
        assert 'data-latex="E=mc^2"' in result

    def test_inline_latex_double_dollar(self):
        result = _parse_inline("$$E=mc^2$$")
        assert 'data-latex="E=mc^2"' in result

    def test_mixed_formatting(self):
        result = _parse_inline("**bold** and *italic* and `code`")
        assert 'font-weight: bold' in result
        assert 'font-style: italic' in result
        assert '<code>code</code>' in result

    def test_html_escaping_in_plain_text(self):
        result = _parse_inline("<script>")
        assert "&lt;script&gt;" in result


class TestEncodeCardValue:
    def test_basic_encoding(self):
        result = _encode_card_value({"code": "hello"})
        assert result.startswith("data:")
        assert "%22code%22" in result


# =============================================================================
# 元素构建函数
# =============================================================================

class TestLakeMeta:
    def test_contains_expected_meta(self):
        result = lake_meta()
        assert 'doc-version' in result
        assert 'viewport' in result
        assert 'typography' in result


class TestHeadings:
    def test_h1(self):
        result = h1("Title")
        assert result.startswith("<h1")
        assert "Title" in result
        assert result.endswith("</h1>")

    def test_h2(self):
        result = h2("Subtitle")
        assert result.startswith("<h2")
        assert "Subtitle" in result

    def test_h3(self):
        result = h3("Section")
        assert result.startswith("<h3")
        assert "Section" in result


class TestParagraph:
    def test_plain_paragraph(self):
        result = p("hello")
        assert result.startswith("<p")
        assert "hello" in result
        assert result.endswith("</p>")

    def test_paragraph_with_inline_parsing(self):
        result = p("**bold** text")
        assert 'font-weight: bold' in result

    def test_paragraph_without_inline_parsing(self):
        result = p("**bold** text", parse_inline=False)
        assert 'font-weight: bold' not in result
        assert "**bold** text" in result


class TestBlockquote:
    def test_basic_blockquote(self):
        result = blockquote("quote")
        assert result.startswith("<blockquote")
        assert "quote" in result
        assert result.endswith("</blockquote>")


class TestLists:
    def test_unordered_list(self):
        result = ul(["item1", "item2"])
        assert result.startswith("<ul")
        assert "item1" in result
        assert "item2" in result
        assert result.endswith("</ul>")

    def test_ordered_list(self):
        result = ol(["first", "second"])
        assert result.startswith("<ol")
        assert "first" in result
        assert "second" in result
        assert result.endswith("</ol>")


class TestCodeBlock:
    def test_basic_code_block(self):
        result = code_block("python", "print('hello')")
        assert result.startswith('<card name="codeblock"')
        assert "codeblock" in result

    def test_code_block_escapes_code(self):
        result = code_block("text", "a & b")
        # The code should be encoded inside the card value
        assert result.startswith("<card")


class TestTable:
    def test_basic_table(self):
        result = table(
            [["A1", "B1"], ["A2", "B2"]],
            header=["ColA", "ColB"]
        )
        assert result.startswith("<table")
        assert "lake-table" in result
        assert "ColA" in result
        assert "ColB" in result
        assert "A1" in result
        assert "A2" in result

    def test_table_without_header(self):
        result = table([["A", "B"]])
        assert "<table" in result
        assert "lake-table" in result

    def test_table_with_col_widths(self):
        result = table([["A"]], header=["H"], col_widths=[200])
        assert 'width="200"' in result


class TestFormula:
    def test_inline_formula(self):
        result = formula("x^2")
        assert 'data-latex="x^2"' in result
        assert "$$x^2$$" in result

    def test_display_formula(self):
        result = formula("E=mc^2", display=True)
        assert result.startswith("<p")
        assert 'data-latex="E=mc^2"' in result


class TestHrBr:
    def test_hr(self):
        assert hr() == "<hr />"

    def test_br(self):
        assert br() == "<br />"


# =============================================================================
# 文档组装函数
# =============================================================================

class TestBuildLakeHtml:
    def test_includes_doctype(self):
        result = build_lake_html([p("hello")])
        assert result.startswith("<!doctype lake>")

    def test_includes_meta_by_default(self):
        result = build_lake_html([p("hello")])
        assert "doc-version" in result

    def test_excludes_meta_when_requested(self):
        result = build_lake_html([p("hello")], include_meta=False)
        assert "doc-version" not in result

    def test_joins_elements(self):
        result = build_lake_html([h1("Title"), p("Body")])
        assert "Title" in result
        assert "Body" in result


class TestLakeDoc:
    def test_basic_document(self):
        result = lake_doc("My Doc", [
            ("Section 1", ["content"]),
        ])
        assert result.startswith("<!doctype lake>")
        assert "My Doc" in result
        assert "Section 1" in result
        assert "content" in result


# =============================================================================
# Markdown 转 Lake HTML
# =============================================================================

class TestMarkdownToLake:
    def test_empty_string(self):
        result = markdown_to_lake("")
        assert result.startswith("<!doctype lake>")

    def test_heading_levels(self):
        result = markdown_to_lake("# H1\n## H2\n### H3")
        assert "<h1" in result
        assert "<h2" in result
        assert "<h3" in result
        assert "H1" in result
        assert "H2" in result
        assert "H3" in result

    def test_paragraph(self):
        result = markdown_to_lake("hello world")
        assert "<p" in result
        assert "hello world" in result

    def test_bold_in_paragraph(self):
        result = markdown_to_lake("**bold** text")
        assert "font-weight: bold" in result
        assert "bold" in result

    def test_italic_in_paragraph(self):
        result = markdown_to_lake("*italic* text")
        assert "font-style: italic" in result

    def test_inline_code(self):
        result = markdown_to_lake("`code` text")
        assert "<code>code</code>" in result

    def test_code_block(self):
        md = "```python\nprint('hello')\n```"
        result = markdown_to_lake(md)
        assert '<card name="codeblock"' in result

    def test_unordered_list(self):
        result = markdown_to_lake("- item1\n- item2")
        assert "<ul" in result
        assert "item1" in result
        assert "item2" in result

    def test_ordered_list(self):
        result = markdown_to_lake("1. first\n2. second")
        assert "<ol" in result
        assert "first" in result
        assert "second" in result

    def test_blockquote(self):
        result = markdown_to_lake("> quote")
        assert "<blockquote" in result
        assert "quote" in result

    def test_multi_line_blockquote(self):
        result = markdown_to_lake("> line1\n> line2")
        assert "<blockquote" in result
        assert "line1" in result
        assert "line2" in result

    def test_horizontal_rule(self):
        result = markdown_to_lake("---")
        assert "<hr />" in result

    def test_table(self):
        md = "| A | B |\n|---|---|\n| 1 | 2 |"
        result = markdown_to_lake(md)
        assert "<table" in result
        assert "lake-table" in result
        assert "A" in result
        assert "B" in result
        assert "1" in result
        assert "2" in result

    def test_inline_formula(self):
        result = markdown_to_lake("$E=mc^2$")
        assert 'data-latex="E=mc^2"' in result

    def test_display_formula_single_line(self):
        result = markdown_to_lake("$$E=mc^2$$")
        assert 'data-latex="E=mc^2"' in result
        assert "<p" in result  # display formula wraps in <p>

    def test_display_formula_multiline(self):
        md = "$$\nE = mc^2\n$$"
        result = markdown_to_lake(md)
        assert 'data-latex="E = mc^2"' in result

    def test_mixed_document(self):
        md = """# Title

Paragraph with **bold**.

```python
code
```

| A | B |
|---|---|
| 1 | 2 |

- list item

> quote
"""
        result = markdown_to_lake(md)
        assert "<h1" in result
        assert "Title" in result
        assert "font-weight: bold" in result
        assert '<card name="codeblock"' in result
        assert "<table" in result
        assert "<ul" in result
        assert "<blockquote" in result

    def test_ignores_empty_lines(self):
        result = markdown_to_lake("\n\nhello\n\n")
        assert "hello" in result
        # Should not contain multiple empty elements
        assert result.count("<p") >= 1
