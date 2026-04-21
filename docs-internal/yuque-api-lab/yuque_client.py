#!/usr/bin/env python3
"""
================================================================================
语雀 (Yuque) 内部 Web API 客户端
================================================================================

【设计目的】
封装语雀内部 Web API 的通用调用逻辑，提供高层次的便捷方法，
供 Jupyter Notebook 测试和实验使用。

【与飞书客户端的区别】
- 飞书：使用 Token 认证（tenant_access_token）
- 语雀：使用 Cookie 认证（_yuque_session + _ctoken）

【核心发现】
语雀内部 Web API 创建/更新文档时，必须使用 body_asl 字段保存内容。
使用 body 字段会导致 API 返回成功，但文档内容为空（content 长度为 0）。

【典型用法】
    from yuque_client import YuqueClient
    client = YuqueClient()

    # 列出知识库
    books = client.list_books()

    # 创建文档（content 会自动包装为 Lake HTML）
    doc = client.create_doc(book_id, "标题", "<h1>内容</h1>")

    # 读取文档
    doc = client.read_doc(book_id, doc_slug)

    # 更新文档
    client.update_doc(doc_id, title="新标题", content="<h1>新内容</h1>")

    # 删除文档
    client.delete_doc(doc_id, book_id)
================================================================================
"""

import json
import os
import re
import urllib.parse
from pathlib import Path
from typing import Optional, List, Dict, Any

import requests


# =============================================================================
# YuqueClient 类
# =============================================================================

class YuqueClient:
    """
    语雀内部 Web API 客户端

    通过浏览器 Cookie 认证，完全免费，无需超级会员。
    """

    BASE_URL = "https://www.yuque.com"

    # -------------------------------------------------------------------------
    # 初始化
    # -------------------------------------------------------------------------

    def __init__(self, session: Optional[str] = None, ctoken: Optional[str] = None):
        """
        初始化客户端

        参数:
            session: _yuque_session Cookie 值。如果不提供，从 .env 文件读取。
            ctoken:  _ctoken Cookie 值。如果不提供，从 .env 文件读取。

        异常:
            RuntimeError: 如果 session 或 ctoken 未提供且无法从 .env 读取。
        """
        self.session = session or self._load_env("YUQUE_SESSION")
        self.ctoken = ctoken or self._load_env("YUQUE_CTOKEN")

        if not self.session or not self.ctoken:
            raise RuntimeError(
                "YUQUE_SESSION 或 YUQUE_CTOKEN 未配置。\n"
                "请在 .env 文件中添加：\n"
                "  YUQUE_SESSION=从浏览器Cookie复制的值\n"
                "  YUQUE_CTOKEN=从浏览器Cookie复制的值"
            )

        self.cookie = f"_yuque_session={self.session}; _ctoken={self.ctoken}"
        self._books_cache: Optional[List[Dict]] = None

    @staticmethod
    def _load_env(key: str) -> Optional[str]:
        """从环境变量或 .env 文件读取配置值"""
        # 1. 先尝试环境变量
        value = os.getenv(key)
        if value:
            return value

        # 2. 再尝试 .env 文件（处理编码问题）
        env_path = Path("../../.env")
        if not env_path.exists():
            env_path = Path(".env")
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith(f"{key}="):
                        return line.split("=", 1)[1].strip()
        return None

    # -------------------------------------------------------------------------
    # 底层 API 调用
    # -------------------------------------------------------------------------

    def api(
        self,
        method: str,
        path: str,
        data: Optional[Dict] = None,
        query: Optional[Dict[str, str]] = None,
        referer: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        调用语雀内部 Web API 的通用方法

        参数:
            method:  HTTP 方法，'GET' | 'POST' | 'PUT' | 'DELETE'
            path:    API 路径（不含域名前缀，如 '/api/books'）
            data:    请求体（POST/PUT 时使用）
            query:   URL 查询参数
            referer: Referer 头（写操作必需，否则返回 403）

        返回:
            API 返回的 JSON 数据

        异常:
            requests.RequestException: 网络请求失败
        """
        url = f"{self.BASE_URL}{path}"
        if query:
            url += "?" + "&".join(f"{k}={v}" for k, v in query.items())

        headers = {
            "Cookie": self.cookie,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json, text/plain, */*",
            "X-CSRF-Token": self.ctoken,
            "X-Requested-With": "XMLHttpRequest",
        }

        # 【关键】写操作必须有 Referer，否则 403
        if referer:
            headers["Referer"] = referer

        # 写操作需要 Content-Type
        if data and method not in ("GET", "DELETE"):
            headers["Content-Type"] = "application/json"

        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"不支持的 HTTP 方法: {method}")

        return response.json()

    # -------------------------------------------------------------------------
    # 便捷方法：知识库操作
    # -------------------------------------------------------------------------

    def list_books(self, use_cache: bool = True) -> List[Dict[str, Any]]:
        """
        列出当前登录用户的所有知识库

        参数:
            use_cache: 是否使用缓存（避免重复请求）

        返回:
            知识库列表，每个元素包含 id, slug, name, description 等字段
        """
        if use_cache and self._books_cache is not None:
            return self._books_cache

        result = self.api("GET", "/api/books")
        books = result.get("data", [])
        self._books_cache = books
        return books

    def get_book(self, book_id: int) -> Optional[Dict[str, Any]]:
        """根据 ID 获取知识库信息"""
        for book in self.list_books():
            if book["id"] == book_id:
                return book
        return None

    def get_toc(self, book_id: int) -> List[Dict[str, Any]]:
        """
        获取知识库的目录结构（TOC）

        返回:
            目录项列表，每个元素包含：
                - type: 'TITLE'（目录项）或 'DOC'（文档项）
                - title: 标题
                - url: 文档 slug（DOC 类型才有）
                - depth: 层级深度
        """
        result = self.api("GET", f"/api/books/{book_id}/toc")
        return result.get("data", {}).get("toc", [])

    # -------------------------------------------------------------------------
    # 便捷方法：文档操作
    # -------------------------------------------------------------------------

    def read_doc(self, book_id: int, doc_slug: str) -> Dict[str, Any]:
        """
        读取文档详情

        参数:
            book_id:  知识库数字 ID
            doc_slug: 文档 slug（从 TOC 中获取，字段名为 url）

        返回:
            文档详情，包含 id, title, slug, content（Lake HTML）等字段

        注意:
            读取返回的内容字段是 content，不是 body 或 body_asl。
        """
        result = self.api(
            "GET",
            f"/api/docs/{doc_slug}",
            query={"book_id": str(book_id)},
        )
        return result.get("data", {})

    def create_doc(
        self,
        book_id: int,
        title: str,
        content: Optional[str] = None,
        public: int = 0,
        format: str = "lake",
    ) -> Dict[str, Any]:
        """
        在指定知识库中创建新文档

        参数:
            book_id: 知识库数字 ID
            title:   文档标题
            content: 文档正文内容
            public:  可见性（0=私密, 1=互联网公开, 2=空间成员公开）
            format:  内容格式（"lake"=自动转Lake HTML, "markdown"=直接传Markdown, "html"=直接传HTML）

        返回:
            新创建的文档信息，包含 id 和 slug

        重要:
            - format="lake" 时，底层使用 body_asl 字段，非 Lake HTML 会自动包装
            - format="markdown" 时，底层使用 body 字段，语雀服务端自动解析渲染
        """
        payload: Dict[str, Any] = {
            "book_id": book_id,
            "title": title,
            "format": format,
            "public": public,
        }

        if content is not None:
            if format == "markdown" or format == "html":
                # 直接传 body，让语雀服务端自己解析
                payload["body"] = str(content)
            else:
                # lake 格式：如果不是标准 Lake HTML，自动包装
                body_str = str(content)
                if not body_str.startswith("<!doctype lake>"):
                    body_str = f"<!doctype lake>{body_str}"
                payload["body_asl"] = body_str

        result = self.api(
            "POST",
            "/api/docs",
            data=payload,
            referer=f"{self.BASE_URL}/{book_id}",
        )
        return result.get("data", {})

    def update_doc(
        self,
        doc_id: int,
        title: Optional[str] = None,
        content: Optional[str] = None,
        format: str = "lake",
        replace_text: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        更新已有文档的标题或内容

        参数:
            doc_id:       文档数字 ID（不是 slug！从 read_doc 结果中获取）
            title:        新标题（可选）
            content:      新正文（可选，传入则全量替换）
            format:       内容格式（"lake"=自动转Lake HTML, "markdown"=直接传Markdown, "html"=直接传HTML）
            replace_text: 局部替换（可选），传入 {"old": "原文本", "new": "新文本"}
                          后端自动读取当前内容 → 替换 → 提交

        返回:
            更新后的文档信息

        重要:
            - doc_id 是数字 ID，不是 slug！
            - 不传 content 只传 title → 只改标题，保留内容
            - 传了 content → 全量替换
            - 传了 replace_text → 局部替换一句话（不需要自己读取拼接）
        """
        payload: Dict[str, Any] = {"format": format}

        if title is not None:
            payload["title"] = title

        # 如果提供了 replace_text，先读取文档 → 替换 → 提交
        if replace_text is not None:
            old_text = replace_text.get("old", "")
            new_text = replace_text.get("new", "")
            if not old_text:
                raise ValueError("replace_text 必须包含 'old' 字段")

            # 读取当前文档
            current_doc = self.api("GET", f"/api/docs/{doc_id}", referer=f"{self.BASE_URL}")
            doc_data = current_doc.get("data", {})

            # 获取可编辑内容：优先原始格式字段，回退到 content
            current_content = (
                doc_data.get("body")
                or doc_data.get("body_asl")
                or doc_data.get("content")
                or ""
            )

            if not current_content:
                raise ValueError(
                    "替换失败：无法读取文档内容。"
                    "语雀 API 可能未返回 body/body_asl/content 字段。"
                    "建议改用 content 参数进行全量更新。"
                )

            # 尝试精确匹配
            if old_text in current_content:
                replaced_content = current_content.replace(old_text, new_text, 1)
            else:
                # 尝试规范化匹配：去除 HTML 标签和多余空白
                import re
                text_version = re.sub(r"<[^>]+>", "", current_content)
                text_version = re.sub(r"\s+", " ", text_version).strip()
                search_text = re.sub(r"\s+", " ", old_text).strip()

                if search_text in text_version:
                    # 在原始内容中定位并替换（简化处理：直接替换第一次出现的纯文本）
                    # 注意：这可能在 HTML 属性中误匹配，但对于普通文本通常安全
                    replaced_content = current_content.replace(old_text, new_text, 1)
                else:
                    preview = current_content[:200].replace("\n", " ")
                    raise ValueError(
                        f'替换失败：文档中未找到 "{old_text[:50]}"\n'
                        f'文档内容前 200 字符：{preview}...\n'
                        f'提示：请确保 old 文本与文档中的文本完全一致（包括空格）。'
                    )

            # 放入 payload：根据内容类型智能选择字段
            # 如果原始内容来自 body/body_asl，优先保持原字段
            # 如果原始内容来自 content（渲染后的 HTML），传 body 让服务端解析
            if doc_data.get("body"):
                payload["body"] = replaced_content
            elif doc_data.get("body_asl"):
                payload["body_asl"] = replaced_content
            else:
                # 只能从 content 获取到内容，传 body 让服务端解析
                payload["body"] = replaced_content
                # 如果当前 format 是 lake 但 content 是渲染后的 HTML，
                # 改为 markdown 格式让服务端正确解析
                if format == "lake" and not replaced_content.startswith("<!doctype lake>"):
                    payload["format"] = "markdown"
        elif content is not None:
            if format == "markdown" or format == "html":
                # 直接传 body，让语雀服务端自己解析
                payload["body"] = str(content)
            else:
                # lake 格式：如果不是标准 Lake HTML，自动包装
                body_str = str(content)
                if not body_str.startswith("<!doctype lake>"):
                    body_str = f"<!doctype lake>{body_str}"
                payload["body_asl"] = body_str

        result = self.api(
            "PUT",
            f"/api/docs/{doc_id}",
            data=payload,
            referer=f"{self.BASE_URL}",
        )
        return result.get("data", {})

    def delete_doc(self, doc_id: int, book_id: int) -> bool:
        """
        删除指定文档

        参数:
            doc_id:  文档数字 ID
            book_id: 知识库数字 ID（用于 query 参数）

        返回:
            True 表示删除成功

        警告:
            删除操作不可逆！
        """
        result = self.api(
            "DELETE",
            f"/api/docs/{doc_id}",
            query={"book_id": str(book_id)},
            referer=f"{self.BASE_URL}/{book_id}",
        )
        return "data" in result

    # -------------------------------------------------------------------------
    # 工具方法
    # -------------------------------------------------------------------------

    def upload_image(self, image_path: str) -> Dict[str, Any]:
        """
        上传图片到语雀 CDN

        参数:
            image_path: 本地图片文件路径

        返回:
            { url: "https://cdn.nlark.com/...", filekey: "...", name: "..." }
        """
        from pathlib import Path
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"图片文件不存在: {image_path}")

        url = f"{self.BASE_URL}/api/upload/attach"
        headers = {
            "Cookie": self.cookie,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json, text/plain, */*",
            "X-CSRF-Token": self.ctoken,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{self.BASE_URL}",
        }

        with open(path, "rb") as f:
            files = {"image": (path.name, f, f"image/{path.suffix.lstrip('.')}")}
            data = {"attach_type": "image"}
            response = requests.post(url, headers=headers, files=files, data=data)

        result = response.json()
        if result.get("data", {}).get("url"):
            return {
                "url": result["data"]["url"],
                "filekey": result["data"].get("filekey"),
                "name": result["data"].get("name", path.name),
            }
        raise RuntimeError(f"上传失败: {result}")

    def get_referer(self, book_id: int) -> str:
        """获取指定知识库的 Referer URL（写操作必需）"""
        return f"{self.BASE_URL}/{book_id}"

    def format_toc(self, book_id: int) -> str:
        """格式化输出知识库目录结构（供打印查看）"""
        toc = self.get_toc(book_id)
        lines = []
        for item in toc:
            indent = "  " * item.get("depth", 0)
            icon = "📄" if item["type"] == "DOC" else "📁"
            slug_info = f" (slug: {item['url']})" if item.get("url") else ""
            lines.append(f"{indent}{icon} {item['title']}{slug_info}")
        return "\n".join(lines)


# =============================================================================
# 便捷函数：快速创建 Lake HTML
# =============================================================================

def lake_html(*elements: str) -> str:
    """
    快速将多个 HTML 元素组装为 Lake HTML 文档

    示例:
        html = lake_html(
            "<h1>标题</h1>",
            "<p>正文</p>",
        )
    """
    body = "\n".join(elements)
    return f"<!doctype lake>{body}"


def lake_table(headers: List[str], rows: List[List[str]], col_widths: Optional[List[int]] = None) -> str:
    """
    创建语雀 Lake HTML 表格

    参数:
        headers:    表头列表
        rows:       数据行列表
        col_widths: 列宽列表（可选，默认每列 150px）

    示例:
        table = lake_table(
            ["姓名", "年龄"],
            [["张三", "25"], ["李四", "30"]],
            col_widths=[200, 200],
        )
    """
    num_cols = len(headers)
    if col_widths is None:
        col_widths = [150] * num_cols
    total_width = sum(col_widths)

    cols = "".join(f'<col width="{w}">' for w in col_widths)
    colgroup = f"<colgroup>{cols}</colgroup>"

    ths = "".join(
        f'<td><p><span>{h}</span></p></td>' for h in headers
    )
    thead = f"<thead><tr>{ths}</tr></thead>"

    trs = []
    for row in rows:
        tds = "".join(f'<td><p><span>{cell}</span></p></td>' for cell in row)
        trs.append(f"<tr>{tds}</tr>")
    trs_str = '\n'.join(trs)
    tbody = f"<tbody>\n{trs_str}\n</tbody>"

    return (
        f'<table class="lake-table" style="width: {total_width}px">'
        f"{colgroup}{thead}{tbody}"
        f"</table>"
    )


def _encode_card_value(data: Dict[str, Any]) -> str:
    """编码语雀 Card 标签的 value 属性"""
    return "data:" + urllib.parse.quote(json.dumps(data, ensure_ascii=False))


def lake_code_block(language: str, code: str) -> str:
    """
    创建语雀 Lake HTML 代码块（使用标准 <card> 格式）

    语雀 Lake 的代码块不是 <pre><code>，而是嵌入的卡片：
    <card name="codeblock" value="data:%7B%22code%22%3A%22...%22%7D"></card>

    示例:
        block = lake_code_block("python", "print('hello')")
    """
    data = {"code": code, "mode": language or "text"}
    return f'<card name="codeblock" value="{_encode_card_value(data)}"></card>'


def lake_formula(latex: str, display: bool = False) -> str:
    """
    创建语雀 Lake HTML 数学公式

    参数:
        latex:   LaTeX 公式内容
        display: 是否为行间公式（默认行内）

    示例:
        f = lake_formula("E = mc^2")
        f_display = lake_formula("\\int_0^\\infty e^{-x} dx = 1", display=True)
    """
    escaped = latex.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    if display:
        return f'<p><span data-latex="{escaped}">$${escaped}$$</span></p>'
    return f'<span data-latex="{escaped}">$${escaped}$$</span>'


# =============================================================================
# 模块自测
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("YuqueClient 自测")
    print("=" * 60)

    try:
        client = YuqueClient()
        print("[PASS] 客户端初始化成功")

        books = client.list_books()
        print(f"[PASS] 获取知识库: {len(books)} 个")
        if books:
            print(f"       第一个: {books[0]['name']} (ID={books[0]['id']})")

    except Exception as e:
        print(f"[FAIL] {e}")
