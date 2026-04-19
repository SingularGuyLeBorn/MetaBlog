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

import os
import re
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
    ) -> Dict[str, Any]:
        """
        在指定知识库中创建新文档

        参数:
            book_id: 知识库数字 ID
            title:   文档标题
            content: 文档正文（HTML 格式）。如果提供，会自动包装为 Lake HTML。
            public:  可见性（0=私密, 1=互联网公开, 2=空间成员公开）

        返回:
            新创建的文档信息，包含 id 和 slug

        重要:
            底层使用 body_asl 字段提交给语雀 API。使用 body 字段会导致内容为空。
        """
        payload: Dict[str, Any] = {
            "book_id": book_id,
            "title": title,
            "format": "lake",
            "public": public,
        }

        if content is not None:
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
    ) -> Dict[str, Any]:
        """
        更新已有文档的标题或内容

        参数:
            doc_id:  文档数字 ID（不是 slug！从 read_doc 结果中获取）
            title:   新标题（可选）
            content: 新正文（HTML 格式，可选）

        返回:
            更新后的文档信息

        重要:
            - doc_id 是数字 ID，不是 slug！
            - 底层使用 body_asl 字段提交给语雀 API
        """
        payload: Dict[str, Any] = {"format": "lake"}

        if title is not None:
            payload["title"] = title
        if content is not None:
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
    tbody = f"<tbody>\n{'\n'.join(trs)}\n</tbody>"

    return (
        f'<table class="lake-table" style="width: {total_width}px">'
        f"{colgroup}{thead}{tbody}"
        f"</table>"
    )


def lake_code_block(language: str, code: str) -> str:
    """
    创建语雀 Lake HTML 代码块

    示例:
        block = lake_code_block("python", "print('hello')")
    """
    return f'<pre><code class="language-{language}">{code}</code></pre>'


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
