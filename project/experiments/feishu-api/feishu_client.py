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
            use_user_token: 是否使用 user_access_token(而非 tenant_access_token)。
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
            # multipart/form-data 上传文件(可同时传 data form fields)
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

    def api(self, method: str, path: str, retries: int = 2, **kwargs) -> Any:
        """发送 API 请求并自动检查错误码，返回 data 字段
        
        对可重试错误(429/502/503/504)自动重试，指数退避。
        """
        import time
        import random
        last_error = None
        for attempt in range(retries + 1):
            try:
                result = self.request(method, path, **kwargs)
                code = result.get("code", 0)
                if code != 0:
                    # 可重试错误码
                    if code in (429, 502, 503, 504) and attempt < retries:
                        delay = (2 ** attempt) + random.uniform(0, 1)
                        time.sleep(delay)
                        continue
                    raise RuntimeError(f"API 错误 {code}: {result.get('msg')} | path={path}")
                return result.get("data", result)
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                last_error = e
                if attempt < retries:
                    delay = (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(delay)
                    continue
                raise RuntimeError(f"请求失败(已重试 {retries} 次): {e} | path={path}")
        raise RuntimeError(f"请求失败: {last_error} | path={path}")

    # ============ 便捷方法 ============

    def upload_image(self, document_id: str, image_path: str) -> Dict[str, Any]:
        """
        上传图片到飞书文档素材库

        参数:
            document_id: 飞书文档 ID(docx 的 document_id)
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
        创建知识库空间(Wiki Space)

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
        获取知识库空间列表(自动翻页获取全部)

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
        获取知识库节点列表(自动翻页获取全部)

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
            node_type: 节点类型，默认 "origin"(普通节点)
            obj_type: 对象类型，默认 "docx"
            parent_node_token: 父节点 token，不传则挂载到根节点
            title: 节点标题(创建 docx 时需要)
            node_token: 指定节点 token(可选)

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
            doc_token: 文档 token(如 docx 的 document_id)
            parent_node_token: 目标父节点 token，不传则挂载到根节点
        """
        payload: Dict[str, Any] = {"obj_token": doc_token, "obj_type": "docx"}
        if parent_node_token:
            payload["parent_node_token"] = parent_node_token
        return self.api("POST", f"/wiki/v2/spaces/{space_id}/nodes/move_docs_to_wiki", json_data=payload, use_user_token=True)

    def delete_wiki_node(self, space_id: str, node_token: str) -> Dict[str, Any]:
        """
        删除知识库节点

        参数:
            space_id: 知识库空间 ID
            node_token: 节点 token
        """
        return self.api("DELETE", f"/wiki/v2/spaces/{space_id}/nodes/{node_token}")

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
            perm: 权限，"view"(可阅读)或 "edit"(可编辑)
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

    # ============ 文档权限操作 ============

    def share_doc(self, document_id: str, member_id: str, member_type: str = "openid",
                  perm: str = "full_access") -> Dict[str, Any]:
        """
        分享飞书文档权限给指定用户

        参数:
            document_id: 飞书文档 ID
            member_id: 用户标识(open_id / 邮箱 / 手机号)
            member_type: 用户标识类型，默认 openid
            perm: 权限级别，默认 full_access
        """
        return self.api("POST", f"/drive/v1/permissions/{document_id}/members", json_data={
            "member_type": member_type,
            "member_id": member_id,
            "perm": perm,
        }, params={"type": "docx"})

    def unshare_doc(self, document_id: str, member_id: str, member_type: str = "openid") -> Dict[str, Any]:
        """
        取消飞书文档对指定用户的权限分享

        参数:
            document_id: 飞书文档 ID
            member_id: 用户标识
            member_type: 用户标识类型，默认 openid
        """
        return self.api("DELETE", f"/drive/v1/permissions/{document_id}/members/{member_id}",
                        params={"type": "docx", "member_type": member_type})

    # ============ 消息操作 ============

    def send_im(self, receive_id: str, content: str, msg_type: str = "text",
                receive_id_type: str = "open_id") -> Dict[str, Any]:
        """
        发送飞书即时消息

        参数:
            receive_id: 接收者 ID
            content: 消息内容
            msg_type: 消息类型，默认 text
            receive_id_type: 接收者 ID 类型，默认 open_id
        """
        message_content = content
        if msg_type == "text" and not content.startswith("{"):
            import json as _json
            message_content = _json.dumps({"text": content})
        return self.api("POST", "/im/v1/messages", json_data={
            "receive_id": receive_id,
            "msg_type": msg_type,
            "content": message_content,
        }, params={"receive_id_type": receive_id_type})

    # ============ 用户操作 ============

    def search_user_keyword(self, query: str, page_size: int = 20) -> Dict[str, Any]:
        """
        按关键词搜索飞书用户(姓名、部门等)

        参数:
            query: 搜索关键词
            page_size: 每页数量
        """
        return self.api("GET", "/contact/v3/users", params={"query": query, "page_size": str(page_size)})

    # ============ 文档搜索与块操作 ============

    def search_docs(self, search_key: str, count: int = 20) -> Dict[str, Any]:
        """
        在飞书云空间中搜索文档

        参数:
            search_key: 搜索关键词
            count: 返回结果数量，最大 50
        """
        return self.api("POST", "/suite/docs-api/search/object", json_data={
            "search_key": search_key,
            "count": min(count, 50),
        })

    def get_doc_blocks(self, document_id: str, page_size: int = 500) -> Dict[str, Any]:
        """
        获取飞书文档的块结构列表

        参数:
            document_id: 文档 ID
            page_size: 每页块数量
        """
        return self.api("GET", f"/docx/v1/documents/{document_id}/blocks", params={"page_size": str(page_size)})

    def update_doc_block(self, document_id: str, block_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        更新飞书文档中的指定块内容

        参数:
            document_id: 文档 ID
            block_id: 块 ID
            update_data: 更新内容，如 {"update_text_elements": {"elements": [...]}}
        """
        return self.api("PATCH", f"/docx/v1/documents/{document_id}/blocks/{block_id}", json_data=update_data)

    def delete_doc_block(self, document_id: str, block_id: str) -> Dict[str, Any]:
        """
        删除飞书文档中的指定块

        参数:
            document_id: 文档 ID
            block_id: 块 ID
        """
        # 1. 获取父块的所有子块，查找目标索引
        list_result = self.api("GET", f"/docx/v1/documents/{document_id}/blocks/{document_id}/children",
                               params={"page_size": "500"})
        items = list_result.get("items", [])
        index = next((i for i, item in enumerate(items) if item.get("block_id") == block_id), -1)
        if index == -1:
            raise RuntimeError(f"未找到指定 block_id 的块: {block_id}")
        # 2. 调用 batch_delete 按索引删除
        return self.api("DELETE", f"/docx/v1/documents/{document_id}/blocks/{document_id}/children/batch_delete",
                        json_data={"start_index": index, "end_index": index + 1})

    # ============ 图片插入(三步法封装) ============

    def insert_image_to_doc(self, document_id: str, image_url: Optional[str] = None,
                            image_base64: Optional[str] = None, file_name: str = "image.png",
                            caption: Optional[str] = None) -> Dict[str, Any]:
        """
        插入图片到飞书文档(完整三步法封装)

        参数:
            document_id: 飞书文档 ID
            image_url: 网络图片 URL(与 image_base64 二选一)
            image_base64: Base64 编码的图片数据(与 image_url 二选一)
            file_name: 图片文件名
            caption: 图注文字(可选)
        """
        import time
        # Step 1: 创建空图片块
        empty_image_block = {"block_type": 27, "image": {}}
        children = [empty_image_block]
        if caption:
            children.insert(0, {"block_type": 2, "text": {"elements": [{"text_run": {"content": caption}}]}})
        create_result = self.api("POST",
                                 f"/docx/v1/documents/{document_id}/blocks/{document_id}/children",
                                 json_data={"children": children})
        image_block_result = next((c for c in create_result.get("children", []) if c.get("block_type") == 27), None)
        if not image_block_result:
            raise RuntimeError("创建图片块后未返回 block_id")
        image_block_id = image_block_result["block_id"]

        time.sleep(0.5)

        # Step 2: 准备图片数据
        if image_url:
            img_res = requests.get(image_url, timeout=30)
            img_res.raise_for_status()
            image_buffer = img_res.content
            final_file_name = image_url.split('/')[-1].split('?')[0] or file_name
        elif image_base64:
            import base64
            base64_data = image_base64.replace("data:image/", "")
            if ";base64," in base64_data:
                base64_data = base64_data.split(";base64,")[1]
            image_buffer = base64.b64decode(base64_data)
            final_file_name = file_name
        else:
            raise ValueError("需要提供 image_url 或 image_base64")

        # Step 3: 上传素材
        form_data = {
            "file_name": final_file_name,
            "parent_type": "docx_image",
            "parent_node": image_block_id,
            "size": str(len(image_buffer)),
        }
        files = {"file": (final_file_name, image_buffer, "image/png")}
        upload_result = self.request("POST", "/drive/v1/medias/upload_all", files=files, data=form_data)
        if upload_result.get("code", 0) != 0:
            raise RuntimeError(f"上传素材失败: {upload_result.get('msg')}")
        file_token = upload_result.get("data", {}).get("file_token")

        # Step 4: PATCH 绑定图片
        self.api("PATCH", f"/docx/v1/documents/{document_id}/blocks/{image_block_id}",
                 json_data={"replace_image": {"token": file_token}})

        return {
            "code": 0,
            "msg": "success",
            "data": {"block_id": image_block_id, "file_token": file_token},
        }


# ============ Markdown → 飞书块 转换器 (Robust版，与TS对齐) ============

import re as _re

_ZERO_WIDTH_CHARS = _re.compile(r'[\u200B-\u200D\uFEFF\u2060]')
_HEADING_RE = _re.compile(r'^(#{1,9})\s+(.+?)(?:\s+#*)?$')
_BULLET_RE = _re.compile(r'^(\s*)-\s+(.+)$')
_ORDERED_RE = _re.compile(r'^(\s*)(\d+)\.\s+(.+)$')
_TODO_RE = _re.compile(r'^(\s*)-\s+\[([ xX])\]\s+(.+)$')
_DIVIDER_RE = _re.compile(r'^(---+|\*\*\*|___|\*\s+\*\s+\*)\s*$')
_CODE_FENCE_RE = _re.compile(r'^```(.*)$')


def md_to_blocks(markdown: str) -> List[Dict[str, Any]]:
    """
    将 Markdown 文本转换为飞书 docx v1 块格式(鲁棒版)

    支持的语法:
    - 块级: 标题(1-9)、无序/有序列表、任务列表、代码块、引用、分割线、表格、公式块
    - 行内: 粗体、斜体、删除线、行内代码、链接、公式
    """
    cleaned = _clean_input(markdown)
    blocks = _parse_blocks(cleaned)
    return [_merge_block_text_elements(b) for b in blocks]


def _clean_input(text: str) -> str:
    text = text.lstrip('\ufeff')
    text = _ZERO_WIDTH_CHARS.sub('', text)
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    return text


def _parse_blocks(markdown: str) -> List[Dict[str, Any]]:
    lines = markdown.split('\n')
    blocks: List[Dict[str, Any]] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line or line.strip() == '':
            i += 1
            continue
        try:
            result = _parse_block(lines, i)
            blocks.append(result['block'])
            i = result['next_index']
        except Exception:
            para_lines = [line]
            i += 1
            while i < len(lines) and lines[i].strip() != '' and not _is_block_start(lines[i]):
                para_lines.append(lines[i])
                i += 1
            blocks.append({
                'block_type': 2,
                'text': {'elements': [{'text_run': {'content': '\n'.join(para_lines)}}]},
            })
    return blocks


def _parse_block(lines, i):
    line = lines[i]

    if line == '$$':
        formula_lines = []
        i += 1
        while i < len(lines) and lines[i] != '$$':
            formula_lines.append(lines[i])
            i += 1
        return {
            'block': {
                'block_type': 2,
                'text': {'elements': [{'equation': {'content': '\n'.join(formula_lines)}}]},
            },
            'next_index': i + 1,
        }

    m = _re.match(r'^\$\$(.+)\$\$$', line)
    if m:
        return {
            'block': {
                'block_type': 2,
                'text': {'elements': [{'equation': {'content': m.group(1)}}]},
            },
            'next_index': i + 1,
        }

    cm = _CODE_FENCE_RE.match(line)
    if cm:
        lang = cm.group(1).strip()
        code_lines = []
        i += 1
        while i < len(lines) and not _CODE_FENCE_RE.match(lines[i]):
            code_lines.append(lines[i])
            i += 1
        block = {
            'block_type': 14,
            'code': {'elements': [{'text_run': {'content': '\n'.join(code_lines)}}]},
        }
        if lang:
            block['code']['style'] = {'language': _map_code_language(lang)}
        return {'block': block, 'next_index': i + 1}

    hm = _HEADING_RE.match(line)
    if hm:
        level = min(len(hm.group(1)), 9)
        return {
            'block': {
                'block_type': 2 + level,
                f'heading{level}': {
                    'elements': _parse_inline_elements(hm.group(2)),
                },
            },
            'next_index': i + 1,
        }

    tm = _TODO_RE.match(line)
    if tm:
        return {
            'block': {
                'block_type': 17,
                'todo': {
                    'elements': _parse_inline_elements(tm.group(3)),
                    'style': {'done': tm.group(2).lower() == 'x'},
                },
            },
            'next_index': i + 1,
        }

    bm = _BULLET_RE.match(line)
    if bm:
        return {
            'block': {
                'block_type': 12,
                'bullet': {'elements': _parse_inline_elements(bm.group(2))},
            },
            'next_index': i + 1,
        }

    om = _ORDERED_RE.match(line)
    if om:
        return {
            'block': {
                'block_type': 13,
                'ordered': {'elements': _parse_inline_elements(om.group(3))},
            },
            'next_index': i + 1,
        }

    if line.startswith('>'):
        quote_lines = []
        while i < len(lines) and lines[i].startswith('>'):
            stripped = _re.sub(r'^>\s?', '', lines[i])
            quote_lines.append(stripped)
            i += 1
        return {
            'block': {
                'block_type': 15,
                'quote': {'elements': _parse_inline_elements('\n'.join(quote_lines))},
            },
            'next_index': i,
        }

    if _DIVIDER_RE.match(line):
        return {'block': {'block_type': 22, 'divider': {}}, 'next_index': i + 1}

    if _is_table_line(line) and i + 1 < len(lines) and _is_table_divider(lines[i + 1]):
        table_lines = [line]
        i += 1
        while i < len(lines) and _is_table_line(lines[i]):
            table_lines.append(lines[i])
            i += 1
        parsed = _parse_markdown_table(table_lines)
        if parsed:
            return {'block': parsed, 'next_index': i}
        return {
            'block': {
                'block_type': 2,
                'text': {'elements': [{'text_run': {'content': '\n'.join(table_lines)}}]},
            },
            'next_index': i,
        }

    para_lines = [line]
    i += 1
    while i < len(lines) and lines[i].strip() != '' and not _is_block_start(lines[i]):
        para_lines.append(lines[i])
        i += 1
    return {
        'block': {
            'block_type': 2,
            'text': {'elements': _parse_inline_elements('\n'.join(para_lines))},
        },
        'next_index': i,
    }


def _is_block_start(line):
    return (
        line == '$$' or
        _re.match(r'^\$\$.+\$\$$', line) is not None or
        _HEADING_RE.match(line) is not None or
        _CODE_FENCE_RE.match(line) is not None or
        _TODO_RE.match(line) is not None or
        _BULLET_RE.match(line) is not None or
        _ORDERED_RE.match(line) is not None or
        line.startswith('>') or
        _DIVIDER_RE.match(line) is not None or
        _is_table_line(line)
    )


def _is_table_line(line):
    return bool(_re.match(r'^\s*\|', line)) or bool(_re.search(r'\|\s*$', line))


def _is_table_divider(line):
    return bool(_re.match(r'^\s*\|?[-:\|\s]+\|?\s*$', line))


def _parse_markdown_table(lines):
    if len(lines) < 2:
        return None
    header_cells = _split_table_cells(lines[0])
    col_count = len(header_cells)
    if col_count == 0:
        return None
    if not _is_table_divider(lines[1]):
        return None
    cell_contents = []
    for cell in header_cells:
        cell_contents.append(_parse_inline_elements(cell))
    for r in range(2, len(lines)):
        cells = _split_table_cells(lines[r])
        for c in range(col_count):
            cell_contents.append(_parse_inline_elements(cells[c] if c < len(cells) else ''))
    row_count = len(lines) - 1
    return {
        'block_type': 31,
        'table': {
            'property': {
                'column_size': col_count,
                'row_size': row_count,
            },
        },
        '_cell_contents': cell_contents,
    }


def _split_table_cells(line):
    content = line.strip()
    if content.startswith('|'):
        content = content[1:]
    if content.endswith('|'):
        content = content[:-1]
    return [s.strip() for s in content.split('|')]


def _parse_inline_elements(text):
    return _parse_inline(text, 0)


def _parse_inline(text, start):
    elements = []
    i = start
    while i < len(text):
        link = _try_parse_link(text, i)
        if link:
            inner = _parse_inline(link['inner_text'], 0)
            elements.extend(_apply_style(inner, 'link', link['url']))
            i = link['end_pos']
            continue

        code = _try_parse_code(text, i)
        if code:
            elements.append({
                'text_run': {
                    'content': code['text'],
                    'text_element_style': {'inline_code': True},
                },
            })
            i = code['end_pos']
            continue

        bold = _try_parse_bold(text, i)
        if bold:
            inner = _parse_inline(bold['inner_text'], 0)
            elements.extend(_apply_style(inner, 'bold'))
            i = bold['end_pos']
            continue

        italic = _try_parse_italic(text, i)
        if italic:
            inner = _parse_inline(italic['inner_text'], 0)
            elements.extend(_apply_style(inner, 'italic'))
            i = italic['end_pos']
            continue

        strike = _try_parse_strikethrough(text, i)
        if strike:
            inner = _parse_inline(strike['inner_text'], 0)
            elements.extend(_apply_style(inner, 'strikethrough'))
            i = strike['end_pos']
            continue

        eq = _try_parse_equation(text, i)
        if eq:
            elements.append({'equation': {'content': eq['content']}})
            i = eq['end_pos']
            continue

        plain_start = i
        while i < len(text) and not _is_inline_marker_start(text, i):
            i += 1
        if i > plain_start:
            elements.append({'text_run': {'content': text[plain_start:i]}})
        else:
            elements.append({'text_run': {'content': text[i]}})
            i += 1

    return _merge_plain_text(elements)


def _is_inline_marker_start(text, i):
    ch = text[i]
    return (
        ch == '[' or
        ch == '`' or
        ch == '$' or
        (ch == '*' and i + 1 < len(text) and text[i + 1] == '*') or
        (ch == '*' and (i + 1 >= len(text) or text[i + 1] != '*')) or
        (ch == '~' and i + 1 < len(text) and text[i + 1] == '~')
    )


def _try_parse_link(text, i):
    if text[i] != '[':
        return None
    depth = 1
    j = i + 1
    while j < len(text) and depth > 0:
        if text[j] == '\\':
            j += 2
            continue
        if text[j] == '[':
            depth += 1
        elif text[j] == ']':
            depth -= 1
        j += 1
    if depth != 0:
        return None
    close_bracket = j - 1
    if j >= len(text) or text[j] != '(':
        return None
    depth = 1
    j += 1
    while j < len(text) and depth > 0:
        if text[j] == '\\':
            j += 2
            continue
        if text[j] == '(':
            depth += 1
        elif text[j] == ')':
            depth -= 1
        j += 1
    if depth != 0:
        return None
    close_paren = j - 1
    return {
        'inner_text': text[i + 1:close_bracket],
        'url': text[close_bracket + 2:close_paren],
        'end_pos': j,
    }


def _try_parse_code(text, i):
    if text[i] != '`':
        return None
    end = text.find('`', i + 1)
    if end == -1 or end == i + 1:
        return None
    return {'text': text[i + 1:end], 'end_pos': end + 1}


def _try_parse_bold(text, i):
    if text[i:i + 2] != '**':
        return None
    end = text.find('**', i + 2)
    if end == -1 or end == i + 2:
        return None
    return {'inner_text': text[i + 2:end], 'end_pos': end + 2}


def _try_parse_italic(text, i):
    if text[i] != '*' or text[i:i + 2] == '**':
        return None
    end = text.find('*', i + 1)
    if end == -1 or end == i + 1 or text[end:end + 2] == '**':
        return None
    return {'inner_text': text[i + 1:end], 'end_pos': end + 1}


def _try_parse_strikethrough(text, i):
    if text[i:i + 2] != '~~':
        return None
    end = text.find('~~', i + 2)
    if end == -1 or end == i + 2:
        return None
    return {'inner_text': text[i + 2:end], 'end_pos': end + 2}


def _try_parse_equation(text, i):
    if text[i] != '$':
        return None
    if text[i:i + 2] == '$$':
        end = text.find('$$', i + 2)
        if end != -1 and end > i + 2:
            return {'content': text[i + 2:end], 'end_pos': end + 2}
        return None
    end = text.find('$', i + 1)
    if end == -1 or end == i + 1:
        return None
    return {'content': text[i + 1:end], 'end_pos': end + 1}


def _apply_style(elements, style_type, url=None):
    result = []
    for el in elements:
        if 'equation' in el:
            result.append(el)
            continue
        style = dict(el.get('text_run', {}).get('text_element_style', {}) or {})
        if style_type == 'bold':
            style['bold'] = True
        elif style_type == 'italic':
            style['italic'] = True
        elif style_type == 'strikethrough':
            style['strikethrough'] = True
        elif style_type == 'link' and url:
            style['link'] = {'url': url}
        result.append({'text_run': {'content': el['text_run']['content'], 'text_element_style': style}})
    return result


def _merge_plain_text(elements):
    result = []
    current = ''
    for el in elements:
        tr = el.get('text_run')
        if tr and (not tr.get('text_element_style') or len(tr['text_element_style']) == 0):
            current += tr['content']
        else:
            if current:
                result.append({'text_run': {'content': current}})
                current = ''
            result.append(el)
    if current:
        result.append({'text_run': {'content': current}})
    return result


def _merge_block_text_elements(block):
    block_type = next((k for k in block if k != 'block_type'), None)
    if not block_type:
        return block
    data = block[block_type]
    if not data or not isinstance(data.get('elements'), list):
        return block
    return {
        **block,
        block_type: {
            **data,
            'elements': _merge_plain_text(data['elements']),
        },
    }


_CODE_LANGUAGE_MAP = {
    'plaintext': 1, 'abap': 2, 'ada': 3, 'apache': 4, 'apex': 5,
    'assembly': 6, 'bash': 7, 'sh': 7, 'shell': 60, 'zsh': 7,
    'csharp': 8, 'cs': 8, 'c#': 8, 'cpp': 9, 'c++': 9, 'c': 10,
    'cobol': 11, 'css': 12, 'coffeescript': 13, 'coffee': 13,
    'd': 14, 'dart': 15, 'delphi': 16, 'django': 17, 'dockerfile': 18,
    'docker': 18, 'erlang': 19, 'fortran': 20, 'foxpro': 21,
    'go': 22, 'golang': 22, 'groovy': 23, 'html': 24, 'htmlbars': 25,
    'http': 26, 'haskell': 27, 'json': 28, 'java': 29,
    'javascript': 30, 'js': 30, 'jsx': 30, 'julia': 31, 'kotlin': 32,
    'latex': 33, 'lisp': 34, 'logo': 35, 'lua': 36, 'matlab': 37,
    'makefile': 38, 'markdown': 39, 'md': 39, 'nginx': 40,
    'objective': 41, 'objectivec': 41, 'openedgeabl': 42, 'php': 43,
    'perl': 44, 'postscript': 45, 'power': 46, 'powershell': 46,
    'prolog': 47, 'protobuf': 48, 'python': 49, 'py': 49, 'r': 50,
    'rpg': 51, 'ruby': 52, 'rb': 52, 'rust': 53, 'sas': 54, 'scss': 55,
    'sql': 56, 'scala': 57, 'scheme': 58, 'scratch': 59, 'swift': 61,
    'thrift': 62, 'typescript': 63, 'ts': 63, 'tsx': 63, 'vbscript': 64,
    'visual': 65, 'xml': 66, 'yaml': 67, 'yml': 67, 'cmake': 68,
    'diff': 69, 'gherkin': 70, 'graphql': 71, 'glsl': 72,
    'properties': 73, 'solidity': 74, 'toml': 75,
}


def _map_code_language(lang):
    return _CODE_LANGUAGE_MAP.get(lang.lower(), 1)


# ============================================================
# 兼容层 helper
# ============================================================

def make_text_block(content: str) -> Dict[str, Any]:
    """创建一个纯文本块"""
    return {
        'block_type': 2,
        'text': {
            'elements': [{'text_run': {'content': content}}],
        },
    }


def make_heading_block(content: str, level: int = 1) -> Dict[str, Any]:
    """创建一个标题块 (level: 1-9)"""
    block_type = 2 + level
    field_name = f'heading{level}'
    return {
        'block_type': block_type,
        field_name: {
            'elements': [{'text_run': {'content': content}}],
        },
    }


def make_code_block(content: str) -> Dict[str, Any]:
    """创建一个代码块"""
    return {
        'block_type': 14,
        'code': {
            'elements': [{'text_run': {'content': content}}],
        },
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
