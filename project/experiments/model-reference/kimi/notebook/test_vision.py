#!/usr/bin/env python3
"""测试 Kimi K2.5 图像理解 API"""
import os
import sys
import base64
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env
dotenv_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

api_key = os.getenv("VITE_KIMI_API_KEY") or os.getenv("KIMI_API_KEY")
base_url = os.getenv("VITE_KIMI_BASE_URL", "https://api.moonshot.cn/v1")

if not api_key:
    print("❌ 未找到 API Key")
    sys.exit(1)

print(f"✅ API Key: {api_key[:10]}...")
print(f"✅ Base URL: {base_url}")

# 测试图片路径
test_image = Path(__file__).parent.parent.parent.parent.parent / "test_ocr.png"
if not test_image.exists():
    print(f"❌ 测试图片不存在: {test_image}")
    sys.exit(1)

print(f"✅ 测试图片: {test_image}")

# 编码图片
def encode_image(image_path):
    with open(image_path, "rb") as f:
        ext = os.path.splitext(image_path)[1].lower().replace(".", "")
        if ext == "jpg":
            ext = "jpeg"
        base64_data = base64.b64encode(f.read()).decode("utf-8")
        return f"data:image/{ext};base64,{base64_data}"

image_url = encode_image(test_image)
print(f"✅ 图片编码完成，长度: {len(image_url)} 字符")

# 调用 Kimi API
try:
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url=base_url)
    print("✅ OpenAI 客户端初始化成功")

    print("\n🚀 发送请求到 Kimi K2.5...")
    response = client.chat.completions.create(
        model="kimi-k2.5",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_url}},
                    {"type": "text", "text": "请描述这张图片里的文字内容。"}
                ]
            }
        ],
    )

    content = response.choices[0].message.content
    print(f"\n📄 AI 回复:\n{content}")
    print(f"\n✅ 请求成功！Token 使用: {response.usage}")

except Exception as e:
    print(f"\n❌ 请求失败: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
