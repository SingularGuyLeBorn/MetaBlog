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

    def __init__(self, app_id: Optional[str] = None, app_secret: Optional[str] = None):
        self.app_id = app_id or os.environ.get("FEISHU_APP_ID") or os.environ.get("LARK_APP_ID")
        self.app_secret = app_secret or os.environ.get("FEISHU_APP_SECRET") or os.environ.get("LARK_APP_SECRET")

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
        timeout: int = 30
    ) -> Dict[str, Any]:
        """发送飞书 API 请求"""
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
            # multipart/form-data 上传文件
            resp = requests.request(method, url, headers=headers, files=files, timeout=timeout)
        elif json_data is not None:
            headers["Content-Type"] = "application/json"
            resp = requests.request(method, url, headers=headers, json=json_data, timeout=timeout)
        else:
            resp = requests.request(method, url, headers=headers, timeout=timeout)

        try:
            data = resp.json()
        except Exception:
            data = {"raw_text": resp.text, "status_code": resp.status_code}

        return data

    def api(self, method: str, path: str, **kwargs) -> Any:
        """发送 API 请求并自动检查错误码，返回 data 字段"""
        result = self.request(method, path, **kwargs)
        code = result.get("code", 0)
        if code != 0:
            raise RuntimeError(f"API 错误 {code}: {result.get('msg')} | path={path}")
        return result.get("data", result)

    # ============ 便捷方法 ============

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
