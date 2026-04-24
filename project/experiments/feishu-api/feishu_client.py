"""
飞书 Open API Python 客户端
封装 tenant_access_token 认证、Token 缓存、通用 API 调用

参考:
- joeseesun/qiaomu-feishu-lark-agent
- 飞书开放平台文档: https://open.feishu.cn/document/server-docs
"""

import os
import json
import time
import tempfile
from pathlib import Path
from urllib.parse import urlencode
from typing import Optional, Dict, Any, List
import requests

BASE_URL = "https://open.feishu.cn/open-apis"


class FeishuClient:
    """飞书 API 客户端"""

    def __init__(self, app_id: Optional[str] = None, app_secret: Optional[str] = None, user_access_token: Optional[str] = None):
        self.app_id = app_id or os.environ.get("FEISHU_APP_ID") or os.environ.get("LARK_APP_ID")
        self.app_secret = app_secret or os.environ.get("FEISHU_APP_SECRET") or os.environ.get("LARK_APP_SECRET")
        self.user_access_token = user_access_token or os.environ.get("FEISHU_USER_ACCESS_TOKEN")

        if not self.app_id or not self.app_secret:
            raise ValueError(
                "缺少 app_id 或 app_secret。\n"
                "请在 .env 中设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET，\n"
                "或传入参数 FeishuClient(app_id='cli_xxx', app_secret='xxx')"
            )

        # Token 缓存文件
        cache_key = self.app_id[-8:] if len(self.app_id) >= 8 else self.app_id
        self._cache_path = Path(tempfile.gettempdir()) / f".feishu_token_{cache_key}.json"
        self._token: Optional[str] = None
        self._expire_at: float = 0

    # ============ 认证 & Token ============

    def _load_cached_token(self) -> Optional[str]:
        """从缓存文件加载 token"""
        if self._cache_path.exists():
            try:
                data = json.loads(self._cache_path.read_text(encoding="utf-8"))
                if data.get("expire_at", 0) > time.time() + 120:
                    self._token = data["token"]
                    self._expire_at = data["expire_at"]
                    return self._token
            except Exception:
                pass
        return None

    def _save_token(self, token: str, expire: int):
        """保存 token 到缓存文件"""
        self._token = token
        self._expire_at = time.time() + expire
        self._cache_path.write_text(
            json.dumps({"token": token, "expire_at": self._expire_at}, ensure_ascii=False),
            encoding="utf-8"
        )

    def get_tenant_access_token(self, force_refresh: bool = False) -> str:
        """获取 tenant_access_token，带缓存"""
        if not force_refresh and self._token and self._expire_at > time.time() + 120:
            return self._token

        cached = self._load_cached_token()
        if cached and not force_refresh:
            return cached

        resp = requests.post(
            f"{BASE_URL}/auth/v3/tenant_access_token/internal",
            json={"app_id": self.app_id, "app_secret": self.app_secret},
            timeout=30
        )
        data = resp.json()

        if data.get("code", 0) != 0:
            raise RuntimeError(f"获取 token 失败: {data.get('msg')} (code: {data.get('code')})")

        token = data["tenant_access_token"]
        expire = data.get("expire", 7200)
        self._save_token(token, expire)
        return token

    def clear_cache(self):
        """清除 token 缓存"""
        self._token = None
        self._expire_at = 0
        if self._cache_path.exists():
            self._cache_path.unlink()

    # ============ 通用 API 调用 ============

    def request(
        self,
        method: str,
        path: str,
        json_data: Optional[Dict] = None,
        params: Optional[Dict] = None,
        files: Optional[Dict] = None,
        data: Optional[Dict] = None,
        timeout: int = 30,
        use_user_token: bool = False,
    ) -> Dict[str, Any]:
        """发送飞书 API 请求

        参数:
            use_user_token: 是否使用 user_access_token（而非 tenant_access_token）。
                            创建 Wiki 知识库等 API 必须使用 user_access_token。
        """
        if use_user_token:
            token = self.user_access_token
            if not token:
                raise RuntimeError(
                    "该 API 需要 user_access_token。\n"
                    "请在初始化时传入 user_access_token，或在 .env 中设置 FEISHU_USER_ACCESS_TOKEN。\n"
                    "获取方式：登录飞书开放平台 → 你的应用 → API 调试台 → 获取 Token"
                )
        elif self.user_access_token and path.startswith('/wiki/'):
            # Wiki 相关 API：如果配置了 user_access_token，优先使用它。
            # 因为用 user token 创建的知识库，tenant token 默认没有访问权限。
            token = self.user_access_token
        else:
            token = self.get_tenant_access_token()
        url = f"{BASE_URL}{path}"

        # 飞书 docx API 需要 document_revision_id，默认 -1 忽略版本锁
        if params is None:
            params = {}
        if '/docx/v1/documents/' in path and 'document_revision_id' not in params:
            params['document_revision_id'] = '-1'
        if params:
            # 过滤 None 值
            params = {k: v for k, v in params.items() if v is not None}
            url += "?" + urlencode(params)

        headers = {"Authorization": f"Bearer {token}"}

        if files:
            # multipart/form-data 上传文件（可同时传 data form fields）
            resp = requests.request(method, url, headers=headers, files=files, data=data, timeout=timeout)
        elif json_data is not None:
            headers["Content-Type"] = "application/json"
            resp = requests.request(method, url, headers=headers, json=json_data, timeout=timeout)
        elif data is not None:
            resp = requests.request(method, url, headers=headers, data=data, timeout=timeout)
        else:
            resp = requests.request(method, url, headers=headers, timeout=timeout)

        try:
            result_data = resp.json()
        except Exception:
            result_data = {"raw_text": resp.text, "status_code": resp.status_code}

        return result_data

    def api(self, method: str, path: str, **kwargs) -> Any:
        """发送 API 请求并自动检查错误码，返回 data 字段"""
        result = self.request(method, path, **kwargs)
        code = result.get("code", 0)
        if code != 0:
            raise RuntimeError(f"API 错误 {code}: {result.get('msg')} | path={path}")
        return result.get("data", result)

    # ============ 便捷方法 ============

    def upload_image(self, document_id: str, image_path: str) -> Dict[str, Any]:
        """
        上传图片到飞书文档素材库

        参数:
            document_id: 飞书文档 ID（docx 的 document_id）
            image_path: 本地图片文件路径

        返回:
            { file_token: "boxcnxxx" }
        """
        from pathlib import Path
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"图片文件不存在: {image_path}")

        file_size = path.stat().st_size
        ext = path.suffix.lstrip(".").lower()
        mime_type = {
            "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "png": "image/png", "gif": "image/gif",
            "webp": "image/webp", "bmp": "image/bmp",
        }.get(ext, "image/png")

        with open(path, "rb") as f:
            files = {
                "file": (path.name, f, mime_type),
            }
            form_data = {
                "file_name": path.name,
                "parent_type": "doc_image",
                "parent_node": document_id,
                "size": str(file_size),
            }
            result = self.request("POST", "/drive/v1/medias/upload_all", files=files, data=form_data)

        if result.get("code", 0) != 0:
            raise RuntimeError(f"上传失败: {result.get('msg')} (code: {result.get('code')})")
        return {"file_token": result["data"]["file_token"]}

    def health_check(self) -> Dict:
        """健康检查：尝试获取 token 并返回状态"""
        try:
            token = self.get_tenant_access_token()
            return {
                "ok": True,
                "token_valid": bool(token),
                "expire_at": self._expire_at,
                "expire_in": int(self._expire_at - time.time()),
            }
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ============ Wiki 知识库 API ============

    def create_wiki_space(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """
        创建知识库空间（Wiki Space）

        【重要】此 API 必须使用 user_access_token，不支持 tenant_access_token。
        请在初始化时传入 user_access_token 或在 .env 中设置 FEISHU_USER_ACCESS_TOKEN。

        参数:
            name: 知识库名称
            description: 知识库描述

        返回:
            { space: { space_id, name, description, ... } }
        """
        payload = {"name": name}
        if description:
            payload["description"] = description
        return self.api("POST", "/wiki/v2/spaces", json_data=payload, use_user_token=True)

    def list_wiki_spaces(self, page_size: int = 10) -> List[Dict[str, Any]]:
        """
        获取知识库空间列表（自动翻页获取全部）

        参数:
            page_size: 每页数量 (1-50)

        返回:
            知识库空间列表
        """
        all_items = []
        page_token = None
        while True:
            params: Dict[str, Any] = {"page_size": page_size}
            if page_token:
                params["page_token"] = page_token
            result = self.api("GET", "/wiki/v2/spaces", params=params)
            items = result.get("items", [])
            all_items.extend(items)
            if not result.get("has_more"):
                break
            page_token = result.get("page_token")
        return all_items

    def get_wiki_space(self, space_id: str) -> Dict[str, Any]:
        """
        获取知识库空间详情

        参数:
            space_id: 知识库空间 ID
        """
        return self.api("GET", f"/wiki/v2/spaces/{space_id}")

    def update_wiki_space(self, space_id: str, name: Optional[str] = None,
                          description: Optional[str] = None) -> Dict[str, Any]:
        """
        更新知识库空间信息

        参数:
            space_id: 知识库空间 ID
            name: 新名称
            description: 新描述
        """
        payload = {}
        if name is not None:
            payload["name"] = name
        if description is not None:
            payload["description"] = description
        return self.api("PUT", f"/wiki/v2/spaces/{space_id}", json_data=payload)

    def delete_wiki_space(self, space_id: str) -> Dict[str, Any]:
        """
        删除知识库空间

        参数:
            space_id: 知识库空间 ID

        返回:
            API 返回结果
        """
        return self.api("DELETE", f"/wiki/v2/spaces/{space_id}", use_user_token=True)

    def list_wiki_nodes(self, space_id: str, parent_node_token: Optional[str] = None,
                        page_size: int = 10) -> List[Dict[str, Any]]:
        """
        获取知识库节点列表（自动翻页获取全部）

        参数:
            space_id: 知识库空间 ID
            parent_node_token: 父节点 token，不传则获取根节点
            page_size: 每页数量

        返回:
            节点列表，每项包含 node_token, obj_type, title, has_child 等
        """
        all_items = []
        page_token = None
        while True:
            params: Dict[str, Any] = {"page_size": page_size}
            if parent_node_token:
                params["parent_node_token"] = parent_node_token
            if page_token:
                params["page_token"] = page_token
            result = self.api("GET", f"/wiki/v2/spaces/{space_id}/nodes", params=params)
            items = result.get("items", [])
            all_items.extend(items)
            if not result.get("has_more"):
                break
            page_token = result.get("page_token")
        return all_items

    def create_wiki_node(self, space_id: str, node_type: str = "origin",
                         obj_type: str = "docx", parent_node_token: Optional[str] = None,
                         title: Optional[str] = None,
                         node_token: Optional[str] = None) -> Dict[str, Any]:
        """
        在知识库中创建节点

        参数:
            space_id: 知识库空间 ID
            node_type: 节点类型，默认 "origin"（普通节点）
            obj_type: 对象类型，默认 "docx"
            parent_node_token: 父节点 token，不传则挂载到根节点
            title: 节点标题（创建 docx 时需要）
            node_token: 指定节点 token（可选）

        返回:
            { node: { node_token, obj_token, ... } }
        """
        payload: Dict[str, Any] = {"node_type": node_type, "obj_type": obj_type}
        if parent_node_token:
            payload["parent_node_token"] = parent_node_token
        if title:
            payload["title"] = title
        if node_token:
            payload["node_token"] = node_token
        return self.api("POST", f"/wiki/v2/spaces/{space_id}/nodes", json_data=payload)

    def move_wiki_node(self, space_id: str, node_token: str,
                       parent_node_token: Optional[str] = None) -> Dict[str, Any]:
        """
        移动知识库节点

        参数:
            space_id: 知识库空间 ID
            node_token: 要移动的节点 token
            parent_node_token: 目标父节点 token，不传则移动到根节点
        """
        payload: Dict[str, Any] = {}
        if parent_node_token:
            payload["parent_node_token"] = parent_node_token
        return self.api("POST", f"/wiki/v2/spaces/{space_id}/nodes/{node_token}/move", json_data=payload, use_user_token=True)

    def move_doc_to_wiki(self, space_id: str, doc_token: str,
                         parent_node_token: Optional[str] = None) -> Dict[str, Any]:
        """
        将已有云文档迁移/挂载到知识库

        参数:
            space_id: 知识库空间 ID
            doc_token: 文档 token（如 docx 的 document_id）
            parent_node_token: 目标父节点 token，不传则挂载到根节点
        """
        payload: Dict[str, Any] = {"obj_token": doc_token, "obj_type": "docx"}
        if parent_node_token:
            payload["parent_node_token"] = parent_node_token
        return self.api("POST", f"/wiki/v2/spaces/{space_id}/nodes/move_docs_to_wiki", json_data=payload, use_user_token=True)

    def delete_wiki_node(self, space_id: str, node_token: str) -> Dict[str, Any]:
        """
        删除知识库节点

        【重要】飞书开放平台目前没有提供通过 API 删除 Wiki 节点或底层文档的公开接口。
        请在飞书客户端手动删除：知识库 → 找到文档 → 右键 → 删除

        参数:
            space_id: 知识库空间 ID
            node_token: 节点 token

        返回:
            提示信息
        """
        return {
            "code": -1,
            "msg": "飞书开放平台未提供 Wiki 节点删除 API",
            "hint": "请在飞书客户端手动删除：知识库 → 找到文档 → 右键 → 删除"
        }

    def list_wiki_members(self, space_id: str, page_size: int = 100) -> List[Dict[str, Any]]:
        """
        获取知识库成员列表

        参数:
            space_id: 知识库空间 ID
            page_size: 每页数量

        返回:
            成员列表
        """
        result = self.api("GET", f"/wiki/v2/spaces/{space_id}/members", params={"page_size": page_size})
        return result.get("items", [])

    def add_wiki_member(self, space_id: str, member_type: str, member_id: str,
                        perm: str = "view") -> Dict[str, Any]:
        """
        添加知识库成员

        参数:
            space_id: 知识库空间 ID
            member_type: 成员类型，"user" 或 "chat"
            member_id: 成员 open_id 或 chat_id
            perm: 权限，"view"（可阅读）或 "edit"（可编辑）
        """
        payload = {
            "member_type": member_type,
            "member_id": member_id,
            "perm": perm,
        }
        return self.api("POST", f"/wiki/v2/spaces/{space_id}/members", json_data=payload)

    def remove_wiki_member(self, space_id: str, member_id: str) -> None:
        """
        移除知识库成员

        参数:
            space_id: 知识库空间 ID
            member_id: 成员 ID
        """
        self.api("DELETE", f"/wiki/v2/spaces/{space_id}/members/{member_id}")


# ============ Markdown → 飞书块 转换器 ============

def md_to_blocks(text: str) -> List[Dict[str, Any]]:
    """
    将简单 Markdown 文本转换为飞书 docx v1 块格式

    支持的语法:
    - # 标题1 → heading1
    - ## 标题2 → heading2
    - ### 标题3 → heading3
    - - 列表 → bullet
    - 1. 有序列表 → ordered
    - 普通文本 → text
    """
    blocks = []
    for line in text.split("\n"):
        line = line.rstrip()
        if not line:
            continue

        if line.startswith("### "):
            blocks.append({
                "block_type": 5,
                "heading3": {
                    "elements": [{"text_run": {"content": line[4:], "text_element_style": {}}}]
                }
            })
        elif line.startswith("## "):
            blocks.append({
                "block_type": 4,
                "heading2": {
                    "elements": [{"text_run": {"content": line[3:], "text_element_style": {}}}]
                }
            })
        elif line.startswith("# "):
            blocks.append({
                "block_type": 3,
                "heading1": {
                    "elements": [{"text_run": {"content": line[2:], "text_element_style": {}}}]
                }
            })
        elif line.startswith("- ") or line.startswith("* "):
            blocks.append({
                "block_type": 12,
                "bullet": {
                    "elements": [{"text_run": {"content": line[2:], "text_element_style": {}}}]
                }
            })
        elif len(line) > 2 and line[0].isdigit() and line[1:3] == ". ":
            blocks.append({
                "block_type": 13,
                "ordered": {
                    "elements": [{"text_run": {"content": line[3:], "text_element_style": {}}}]
                }
            })
        elif line.startswith("> "):
            blocks.append({
                "block_type": 15,
                "quote": {
                    "elements": [{"text_run": {"content": line[2:], "text_element_style": {}}}]
                }
            })
        else:
            blocks.append({
                "block_type": 2,
                "text": {
                    "elements": [{"text_run": {"content": line, "text_element_style": {}}}]
                }
            })
    return blocks


def make_text_block(content: str) -> Dict[str, Any]:
    """创建一个纯文本块"""
    return {
        "block_type": 2,
        "text": {
            "elements": [{"text_run": {"content": content, "text_element_style": {}}}]
        }
    }


def make_heading_block(content: str, level: int = 1) -> Dict[str, Any]:
    """创建一个标题块 (level: 1-9)"""
    block_type = 2 + level  # heading1 = 3, heading2 = 4, ...
    field_name = f"heading{level}"
    return {
        "block_type": block_type,
        field_name: {
            "elements": [{"text_run": {"content": content, "text_element_style": {}}}]
        }
    }


def make_code_block(content: str) -> Dict[str, Any]:
    """创建一个代码块"""
    return {
        "block_type": 14,
        "code": {
            "elements": [{"text_run": {"content": content, "text_element_style": {}}}]
        }
    }


def extract_text_from_block(block: Dict) -> str:
    """从块中提取纯文本"""
    elements = (
        block.get("text", {}).get("elements", [])
        or block.get("heading1", {}).get("elements", [])
        or block.get("heading2", {}).get("elements", [])
        or block.get("heading3", {}).get("elements", [])
        or block.get("bullet", {}).get("elements", [])
        or block.get("ordered", {}).get("elements", [])
        or block.get("code", {}).get("elements", [])
        or block.get("quote", {}).get("elements", [])
        or []
    )
    return "".join(
        el.get("text_run", {}).get("content", "")
        or el.get("mention_doc", {}).get("url", "")
        for el in elements
    )


# ============ 块类型对照表 ============

BLOCK_TYPE_NAMES = {
    1: "page",
    2: "text",
    3: "heading1",
    4: "heading2",
    5: "heading3",
    6: "heading4",
    7: "heading5",
    8: "heading6",
    9: "heading7",
    10: "heading8",
    11: "heading9",
    12: "bullet",
    13: "ordered",
    14: "code",
    15: "quote",
    17: "todo",
    22: "divider",
    27: "image",
    31: "table",
    32: "table_cell",
}


def block_type_name(block_type: int) -> str:
    return BLOCK_TYPE_NAMES.get(block_type, f"type_{block_type}")


if __name__ == "__main__":
    # 快速测试
    try:
        from dotenv import load_dotenv
        env_path = Path(__file__).parent.parent.parent / ".env"
        if env_path.exists():
            load_dotenv(env_path)
            print(f"[OK] Loaded .env: {env_path}")
    except ImportError:
        pass

    client = FeishuClient()
    print(json.dumps(client.health_check(), indent=2, ensure_ascii=False))
