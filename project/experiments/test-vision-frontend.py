#!/usr/bin/env python3
"""模拟前端 vision 请求，测试 /api/chat 接口"""
import os
import sys
import base64
import json
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env
dotenv_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

# 编码图片
test_image = Path(__file__).parent.parent.parent / "test_ocr.png"
with open(test_image, "rb") as f:
    ext = os.path.splitext(test_image)[1].lower().replace(".", "")
    if ext == "jpg":
        ext = "jpeg"
    base64_data = base64.b64encode(f.read()).decode("utf-8")
    image_url = f"data:image/{ext};base64,{base64_data}"

# 构造和前端完全一样的请求体
request_body = {
    "messages": [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "请描述这张图片里的文字内容。"},
                {"type": "image_url", "image_url": {"url": image_url}}
            ]
        }
    ],
    "config": {
        "model": "kimi-k2.5",
        "temperature": 0.6,
        "maxTokens": 8192,
        "enableReasoning": False
    },
    "stream": True,
    "sessionId": "test-vision-session"
}

print(f"[TEST] Sending to http://localhost:5173/api/chat")
print(f"[TEST] Image data URL length: {len(image_url)} chars")

import urllib.request

req = urllib.request.Request(
    "http://localhost:5173/api/chat",
    data=json.dumps(request_body).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=90) as response:
        print(f"[OK] HTTP {response.status}")
        print("[RESPONSE] First 3000 bytes:")
        data = response.read(3000)
        text = data.decode("utf-8", errors="replace")
        print(text[:3000])
        if len(text) >= 3000:
            print("... (truncated)")
except Exception as e:
    print(f"[ERROR] {type(e).__name__}: {e}")
