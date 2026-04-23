#!/usr/bin/env python3
"""
GitHub API 客户端封装

同时支持直接 REST API 调用（requests）和 gh CLI 命令参考。
Agent 工具最终采用 REST API 方式，gh CLI 仅作为本地测试参考。

等效 gh CLI 命令在 docstring 中标注，格式：
  gh> gh repo view owner/repo --json ...
"""

import os
import base64
import json
from pathlib import Path
from typing import Any, Optional
from urllib.parse import quote

import requests
from dotenv import load_dotenv

# 加载 .env
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")


class GitHubError(Exception):
    """GitHub API 错误"""

    def __init__(self, status: int, message: str, response_body: Optional[str] = None):
        self.status = status
        self.message = message
        self.response_body = response_body
        super().__init__(f"[{status}] {message}")


class GitHubClient:
    """
    GitHub REST API 客户端

    gh> gh auth status
    """

    BASE_URL = "https://api.github.com"

    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("VITE_GITHUB_TOKEN")
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {self.token}",
            "User-Agent": "MetaBlog-GitHub-Lab/1.0",
            "X-GitHub-Api-Version": "2022-11-28",
        })

    # ---------- 通用请求 ----------

    def request(self, method: str, endpoint: str, **kwargs) -> dict[str, Any]:
        """发送请求并处理错误"""
        url = f"{self.BASE_URL}{endpoint}"
        resp = self.session.request(method, url, **kwargs)

        if not resp.ok:
            body = resp.text[:500] if resp.text else None
            raise GitHubError(resp.status_code, resp.reason, body)

        # 204 No Content
        if resp.status_code == 204:
            return {}

        return resp.json()

    def get(self, endpoint: str, params: Optional[dict] = None) -> dict[str, Any] | list[Any]:
        return self.request("GET", endpoint, params=params)

    def post(self, endpoint: str, json_data: Optional[dict] = None) -> dict[str, Any]:
        return self.request("POST", endpoint, json=json_data)

    def patch(self, endpoint: str, json_data: Optional[dict] = None) -> dict[str, Any]:
        return self.request("PATCH", endpoint, json=json_data)

    # ---------- 认证 & 健康 ----------

    def health_check(self) -> dict[str, Any]:
        """
        验证 Token 是否有效

        gh> gh auth status
        """
        try:
            user = self.get("/user")
            return {
                "ok": True,
                "login": user.get("login"),
                "rate_limit_remaining": self.session.headers.get("X-RateLimit-Remaining"),
            }
        except GitHubError as e:
            return {"ok": False, "error": e.message, "status": e.status}

    # ---------- 仓库 ----------

    def get_repo(self, owner: str, repo: str) -> dict[str, Any]:
        """
        获取仓库信息

        gh> gh repo view owner/repo --json name,description,stargazersCount,forksCount,primaryLanguage,pushedAt
        """
        return self.get(f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}")

    def list_repos(self, owner: str, type_: str = "owner", per_page: int = 30) -> list[dict[str, Any]]:
        """
        列出用户/组织的仓库

        gh> gh repo list owner --limit 30
        """
        return self.get(f"/users/{quote(owner, safe='')}/repos", params={"type": type_, "per_page": per_page})

    def search_repos(self, query: str, per_page: int = 10) -> dict[str, Any]:
        """
        搜索仓库

        gh> gh search repos "query" --limit 10
        """
        return self.get("/search/repositories", params={"q": query, "per_page": per_page})

    # ---------- 内容 ----------

    def get_contents(self, owner: str, repo: str, path: str = "", ref: Optional[str] = None) -> dict[str, Any] | list[dict[str, Any]]:
        """
        获取仓库目录内容或文件元数据

        gh> gh api repos/owner/repo/contents/path
        """
        params: dict[str, str] = {}
        if ref:
            params["ref"] = ref
        return self.get(f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}/contents/{quote(path, safe='')}", params=params)

    def get_file_content(self, owner: str, repo: str, path: str, ref: Optional[str] = None) -> str:
        """
        获取文件原始内容（自动 base64 解码）

        gh> gh api repos/owner/repo/contents/path | jq -r .content | base64 -d
        """
        data = self.get_contents(owner, repo, path, ref)
        if isinstance(data, list):
            raise GitHubError(400, f"'{path}' 是一个目录，不是文件")
        content = data.get("content", "")
        if not content:
            return ""
        # GitHub API 返回的 base64 有换行符，需先清理
        return base64.b64decode(content.replace("\n", "")).decode("utf-8", errors="replace")

    # ---------- 提交 ----------

    def get_commits(self, owner: str, repo: str, path: Optional[str] = None, per_page: int = 10) -> list[dict[str, Any]]:
        """
        获取提交历史

        gh> gh api repos/owner/repo/commits?per_page=10
        """
        params: dict[str, str | int] = {"per_page": per_page}
        if path:
            params["path"] = path
        return self.get(f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}/commits", params=params)

    # ---------- Issue ----------

    def list_issues(self, owner: str, repo: str, state: str = "open", per_page: int = 10) -> list[dict[str, Any]]:
        """
        列出 Issues

        gh> gh issue list --repo owner/repo --state open --limit 10
        """
        return self.get(f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}/issues", params={"state": state, "per_page": per_page})

    def get_issue(self, owner: str, repo: str, number: int) -> dict[str, Any]:
        """
        获取单个 Issue 详情

        gh> gh issue view 123 --repo owner/repo
        """
        return self.get(f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}/issues/{number}")

    def create_issue(self, owner: str, repo: str, title: str, body: Optional[str] = None, labels: Optional[list[str]] = None) -> dict[str, Any]:
        """
        创建 Issue

        gh> gh issue create --repo owner/repo --title "xxx" --body "yyy" --label bug
        """
        payload: dict[str, Any] = {"title": title}
        if body:
            payload["body"] = body
        if labels:
            payload["labels"] = labels
        return self.post(f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}/issues", json_data=payload)

    # ---------- Pull Request ----------

    def list_pulls(self, owner: str, repo: str, state: str = "open", per_page: int = 10) -> list[dict[str, Any]]:
        """
        列出 Pull Requests

        gh> gh pr list --repo owner/repo --state open --limit 10
        """
        return self.get(f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}/pulls", params={"state": state, "per_page": per_page})

    def get_pull(self, owner: str, repo: str, number: int) -> dict[str, Any]:
        """
        获取单个 PR 详情

        gh> gh pr view 123 --repo owner/repo
        """
        return self.get(f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}/pulls/{number}")

    # ---------- 搜索 ----------

    def search_code(self, query: str, per_page: int = 10) -> dict[str, Any]:
        """
        搜索代码

        gh> gh search code "query" --limit 10
        """
        return self.get("/search/code", params={"q": query, "per_page": per_page})

    def search_issues(self, query: str, per_page: int = 10) -> dict[str, Any]:
        """
        搜索 Issues / PRs

        gh> gh search issues "query" --limit 10
        """
        return self.get("/search/issues", params={"q": query, "per_page": per_page})

    # ---------- Actions Workflow ----------

    def list_workflows(self, owner: str, repo: str) -> dict[str, Any]:
        """
        列出仓库的工作流

        gh> gh workflow list --repo owner/repo
        """
        return self.get(f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}/actions/workflows")

    def list_workflow_runs(self, owner: str, repo: str, per_page: int = 10) -> dict[str, Any]:
        """
        列出工作流运行记录

        gh> gh run list --repo owner/repo --limit 10
        """
        return self.get(f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}/actions/runs", params={"per_page": per_page})

    def trigger_workflow(self, owner: str, repo: str, workflow_id: str, ref: str = "main", inputs: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        """
        触发工作流运行

        gh> gh workflow run workflow_id --repo owner/repo --ref main
        """
        payload: dict[str, Any] = {"ref": ref}
        if inputs:
            payload["inputs"] = inputs
        return self.post(
            f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}/actions/workflows/{workflow_id}/dispatches",
            json_data=payload,
        )


# ---------- 便捷函数 ----------

def format_repo_info(data: dict[str, Any]) -> str:
    """格式化仓库信息为可读文本"""
    lines = [
        f"📦 {data.get('full_name', 'N/A')}",
        f"   ⭐ {data.get('stargazers_count', 0):,}  🍴 {data.get('forks_count', 0):,}  🐛 {data.get('open_issues_count', 0):,}",
        f"   📝 {data.get('description') or '无描述'}",
        f"   🔤 主要语言: {data.get('language') or 'N/A'}",
        f"   🕐 更新于: {data.get('pushed_at', 'N/A')}",
        f"   🔗 {data.get('html_url', '')}",
    ]
    return "\n".join(lines)


def format_issue(item: dict[str, Any]) -> str:
    """格式化 Issue 为单行文本"""
    return f"#{item.get('number')} [{item.get('state')}] {item.get('title')} — @{item.get('user', {}).get('login', '?')}"


def format_pull(item: dict[str, Any]) -> str:
    """格式化 PR 为单行文本"""
    return f"#{item.get('number')} [{item.get('state')}] {item.get('title')} — @{item.get('user', {}).get('login', '?')}"


def format_commit(item: dict[str, Any]) -> str:
    """格式化提交为单行文本"""
    commit = item.get("commit", {})
    msg = commit.get("message", "").split("\n")[0]
    sha = item.get("sha", "")[:7]
    author = commit.get("author", {}).get("name", "?")
    return f"{sha} {msg[:60]} — {author}"
