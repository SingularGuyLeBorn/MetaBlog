"""
05. 图片理解示例
使用视觉模型分析图片内容
"""
import requests
import base64
from config import ZHIPU_BASE_URL, get_headers, check_api_key, DEFAULT_VISION_MODEL

def image_understanding_by_url():
    """通过 URL 分析图片"""
    print("\n" + "="*60)
    print("🖼️  测试 1: 图片 URL 理解")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 使用示例图片
    image_url = "https://cdn.bigmodel.cn/static/logo/register.png"
    
    data = {
        "model": DEFAULT_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url}
                    },
                    {
                        "type": "text",
                        "text": "请描述这张图片的内容"
                    }
                ]
            }
        ],
        "temperature": 0.7,
        "stream": False
    }
    
    print(f"\n📤 发送请求:")
    print(f"  模型: {DEFAULT_VISION_MODEL}")
    print(f"  图片: {image_url}")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 分析结果:")
            print(f"  {content}")
            
            usage = result.get('usage', {})
            print(f"\n📊 Token 统计: {usage.get('total_tokens', 0)}")
        else:
            print(f"\n❌ 请求失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def image_understanding_by_base64():
    """通过 Base64 分析本地图片"""
    print("\n" + "="*60)
    print("🖼️  测试 2: Base64 图片理解")
    print("="*60)
    
    if not check_api_key():
        return
    
    print("\n💡 要使用本地图片，请按以下步骤:")
    print("  1. 准备一张图片（如 test.jpg）")
    print("  2. 读取图片并转为 base64")
    print("  3. 在请求中使用 data:image/jpeg;base64,xxx 格式")
    
    # 示例代码
    example_code = '''
    # 读取本地图片并转为 base64
    with open("test.jpg", "rb") as f:
        image_base64 = base64.b64encode(f.read()).decode("utf-8")
    
    # 在请求中使用
    data = {
        "model": "glm-4.6v-flash",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                {"type": "text", "text": "描述这张图片"}
            ]
        }]
    }
    '''
    
    print(f"\n📝 示例代码:\n{example_code}")
    
    # 实际演示（使用在线图片的 base64 太长了，这里略过）
    print("\n⚠️  跳过实际 Base64 测试（需要本地图片文件）")

def multiple_images_comparison():
    """多张图片对比分析"""
    print("\n" + "="*60)
    print("🖼️  测试 3: 多图对比分析")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 同时发送两张图片
    data = {
        "model": DEFAULT_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": "https://cdn.bigmodel.cn/static/logo/register.png"}
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": "https://cdn.bigmodel.cn/static/logo/api-key.png"}
                    },
                    {
                        "type": "text",
                        "text": "这两张图片有什么共同点和不同点？"
                    }
                ]
            }
        ],
        "temperature": 0.7,
        "stream": False
    }
    
    print(f"\n📤 发送两张图片进行对比分析...")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 对比结果:\n{content}")
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def image_with_thinking():
    """图片理解 + 深度思考"""
    print("\n" + "="*60)
    print("🖼️  测试 4: 图片理解 + 深度思考")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 使用需要推理的图片问题
    data = {
        "model": DEFAULT_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": "https://cdn.bigmodel.cn/static/logo/register.png"}
                    },
                    {
                        "type": "text",
                        "text": "分析一下这个 logo 的设计理念，它想传达什么品牌信息？"
                    }
                ]
            }
        ],
        "thinking": {"type": "enabled"},  # 开启深度思考
        "temperature": 0.7,
        "stream": False
    }
    
    print(f"\n📤 发送请求 (图片 + 深度思考)...")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 深度分析结果:\n{content}")
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

if __name__ == '__main__':
    print("\n🚀 智谱 AI - 图片理解示例")
    print(f"使用视觉模型: {DEFAULT_VISION_MODEL}\n")
    
    image_understanding_by_url()
    image_understanding_by_base64()
    multiple_images_comparison()
    image_with_thinking()
    
    print("\n" + "="*60)
    print("✅ 图片理解测试完成!")
    print("="*60)
