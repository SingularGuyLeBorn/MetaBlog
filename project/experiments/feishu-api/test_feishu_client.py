"""
FeishuClient 基础单元测试
无需真实 API 凭证，主要测试 markdown 解析器和辅助函数
"""

import sys
import os
import json
import pytest
from pathlib import Path

# 将当前目录加入路径以便导入 feishu_client
sys.path.insert(0, str(Path(__file__).parent))

from feishu_client import (
    md_to_blocks,
    make_text_block,
    make_heading_block,
    make_code_block,
    extract_text_from_block,
    FeishuClient,
)


class TestMdToBlocks:
    """Markdown → 飞书块 解析器测试"""

    def test_plain_text(self):
        blocks = md_to_blocks("Hello world")
        assert len(blocks) == 1
        assert blocks[0]["block_type"] == 2
        assert blocks[0]["text"]["elements"][0]["text_run"]["content"] == "Hello world"

    def test_headings(self):
        blocks = md_to_blocks("# H1\n## H2\n### H3")
        assert len(blocks) == 3
        assert blocks[0]["block_type"] == 3
        assert blocks[1]["block_type"] == 4
        assert blocks[2]["block_type"] == 5

    def test_heading_with_inline_bold(self):
        blocks = md_to_blocks("# Hello **World**")
        assert blocks[0]["block_type"] == 3
        els = blocks[0]["heading1"]["elements"]
        assert els[0]["text_run"]["content"] == "Hello "
        assert els[1]["text_run"]["text_element_style"]["bold"] is True
        assert els[1]["text_run"]["content"] == "World"

    def test_bullet_list(self):
        blocks = md_to_blocks("- item 1\n- item 2")
        assert len(blocks) == 2
        assert blocks[0]["block_type"] == 12
        assert blocks[0]["bullet"]["elements"][0]["text_run"]["content"] == "item 1"

    def test_ordered_list(self):
        blocks = md_to_blocks("1. first\n2. second")
        assert blocks[0]["block_type"] == 13
        assert blocks[1]["ordered"]["elements"][0]["text_run"]["content"] == "second"

    def test_todo_list(self):
        blocks = md_to_blocks("- [x] done\n- [ ] pending")
        assert len(blocks) == 2
        assert blocks[0]["block_type"] == 17
        assert blocks[0]["todo"]["style"]["done"] is True
        assert blocks[1]["todo"]["style"]["done"] is False

    def test_quote(self):
        blocks = md_to_blocks("> quote line")
        assert len(blocks) == 1
        assert blocks[0]["block_type"] == 15
        assert blocks[0]["quote"]["elements"][0]["text_run"]["content"] == "quote line"

    def test_divider(self):
        blocks = md_to_blocks("---")
        assert len(blocks) == 1
        assert blocks[0]["block_type"] == 22

    def test_inline_formatting(self):
        blocks = md_to_blocks("**bold** *italic* ~~strike~~ `code` [link](https://ex.com) $E=mc^2$")
        els = blocks[0]["text"]["elements"]
        assert any(e.get("text_run", {}).get("text_element_style", {}).get("bold") for e in els)
        assert any(e.get("text_run", {}).get("text_element_style", {}).get("italic") for e in els)
        assert any(e.get("text_run", {}).get("text_element_style", {}).get("strikethrough") for e in els)
        assert any(e.get("text_run", {}).get("text_element_style", {}).get("inline_code") for e in els)
        assert any(e.get("text_run", {}).get("text_element_style", {}).get("link", {}).get("url") == "https://ex.com" for e in els)
        assert any(e.get("equation", {}).get("content") == "E=mc^2" for e in els)

    def test_code_block_with_language(self):
        blocks = md_to_blocks("```python\ndef hello():\n    pass\n```")
        assert len(blocks) == 1
        assert blocks[0]["block_type"] == 14
        assert blocks[0]["code"]["style"]["language"] == 49
        assert "def hello():" in blocks[0]["code"]["elements"][0]["text_run"]["content"]

    def test_block_equation_single_line(self):
        blocks = md_to_blocks("$$\\int_a^b f(x)dx$$")
        assert len(blocks) == 1
        assert blocks[0]["block_type"] == 2
        assert blocks[0]["text"]["elements"][0]["equation"]["content"] == "\\int_a^b f(x)dx"

    def test_block_equation_multiline(self):
        blocks = md_to_blocks("$$\n\\sum_{i=1}^n i\n$$")
        assert len(blocks) == 1
        assert blocks[0]["text"]["elements"][0]["equation"]["content"] == "\\sum_{i=1}^n i"

    def test_table(self):
        blocks = md_to_blocks("| A | B |\n|---|---|\n| 1 | 2 |")
        assert len(blocks) == 1
        assert blocks[0]["block_type"] == 31
        assert blocks[0]["table"]["property"]["column_size"] == 2
        assert blocks[0]["table"]["property"]["row_size"] == 2
        assert len(blocks[0]["_cell_contents"]) == 4
        assert blocks[0]["_cell_contents"][0][0]["text_run"]["content"] == "A"

    def test_merge_adjacent_plain_text(self):
        blocks = md_to_blocks("Hello **bold** world")
        els = blocks[0]["text"]["elements"]
        assert len(els) == 3  # "Hello " + bold + " world"

    def test_clean_bom_and_zero_width(self):
        blocks = md_to_blocks("\ufeffHello\u200B world")
        assert blocks[0]["text"]["elements"][0]["text_run"]["content"] == "Hello world"

    def test_fallback_unmatched_bold(self):
        blocks = md_to_blocks("unclosed **bold")
        assert blocks[0]["block_type"] == 2
        assert blocks[0]["text"]["elements"][0]["text_run"]["content"] == "unclosed **bold"

    def test_nested_italic_in_bold(self):
        blocks = md_to_blocks("**bold *italic* bold**")
        els = blocks[0]["text"]["elements"]
        assert any(
            e.get("text_run", {}).get("text_element_style", {}).get("bold") and
            not e.get("text_run", {}).get("text_element_style", {}).get("italic")
            for e in els
        )
        assert any(
            e.get("text_run", {}).get("text_element_style", {}).get("bold") and
            e.get("text_run", {}).get("text_element_style", {}).get("italic")
            for e in els
        )

    def test_multiline_paragraph(self):
        blocks = md_to_blocks("line1\nline2\n\nline3")
        assert len(blocks) == 2
        assert "line1\nline2" in blocks[0]["text"]["elements"][0]["text_run"]["content"]
        assert blocks[1]["text"]["elements"][0]["text_run"]["content"] == "line3"


class TestHelperFunctions:
    """辅助函数测试"""

    def test_make_text_block(self):
        b = make_text_block("hello")
        assert b["block_type"] == 2
        assert b["text"]["elements"][0]["text_run"]["content"] == "hello"

    def test_make_heading_block(self):
        b = make_heading_block("title", 2)
        assert b["block_type"] == 4
        assert b["heading2"]["elements"][0]["text_run"]["content"] == "title"

    def test_make_code_block(self):
        b = make_code_block("print(1)")
        assert b["block_type"] == 14
        assert b["code"]["elements"][0]["text_run"]["content"] == "print(1)"

    def test_extract_text_from_block(self):
        b = make_text_block("hello")
        assert extract_text_from_block(b) == "hello"

        b = make_heading_block("title", 1)
        assert extract_text_from_block(b) == "title"

    def test_code_language_map(self):
        from feishu_client import _map_code_language
        assert _map_code_language("python") == 49
        assert _map_code_language("py") == 49
        assert _map_code_language("javascript") == 30
        assert _map_code_language("js") == 30
        assert _map_code_language("UNKNOWN") == 1  # fallback to plaintext


class TestFeishuClientInit:
    """FeishuClient 初始化测试"""

    def test_missing_credentials_raises(self):
        # 清除环境变量，确保会报错
        old_app_id = os.environ.pop("FEISHU_APP_ID", None)
        old_app_secret = os.environ.pop("FEISHU_APP_SECRET", None)
        old_lark_id = os.environ.pop("LARK_APP_ID", None)
        old_lark_secret = os.environ.pop("LARK_APP_SECRET", None)
        try:
            with pytest.raises(ValueError, match="缺少 app_id 或 app_secret"):
                FeishuClient()
        finally:
            # 恢复环境变量
            if old_app_id:
                os.environ["FEISHU_APP_ID"] = old_app_id
            if old_app_secret:
                os.environ["FEISHU_APP_SECRET"] = old_app_secret
            if old_lark_id:
                os.environ["LARK_APP_ID"] = old_lark_id
            if old_lark_secret:
                os.environ["LARK_APP_SECRET"] = old_lark_secret

    def test_explicit_credentials(self):
        client = FeishuClient(app_id="cli_test", app_secret="secret_test")
        assert client.app_id == "cli_test"
        assert client.app_secret == "secret_test"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
