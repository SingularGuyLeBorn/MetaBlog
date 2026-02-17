"""
06. 视频理解示例
分析视频内容，提取关键信息
"""
import requests
import time
from config import ZHIPU_BASE_URL, get_headers, check_api_key, DEFAULT_VISION_MODEL

def video_understanding():
    """视频内容理解"""
    print("\n" + "="*60)
    print("🎬 测试 1: 视频内容理解")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 使用示例视频
    video_url = "https://cdn.bigmodel.cn/agent-demos/lark/113123.mov"
    
    data = {
        "model": DEFAULT_VISION_MODEL,  # glm-4.6v-flash 支持视频
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "video_url",
                        "video_url": {"url": video_url}
                    },
                    {
                        "type": "text",
                        "text": "请描述这个视频的内容，发生了什么？"
                    }
                ]
            }
        ],
        "temperature": 0.7,
        "stream": False
    }
    
    print(f"\n📤 发送请求:")
    print(f"  模型: {DEFAULT_VISION_MODEL}")
    print(f"  视频: {video_url}")
    print("  ⚠️  视频处理需要较长时间，请耐心等待...")
    
    start = time.time()
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=180)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 分析结果 (耗时 {elapsed:.1f}s):")
            print(f"  {content}")
            
            usage = result.get('usage', {})
            print(f"\n📊 Token 统计: {usage.get('total_tokens', 0)}")
        else:
            print(f"\n❌ 请求失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def video_qa():
    """视频问答"""
    print("\n" + "="*60)
    print("🎬 测试 2: 视频问答")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    video_url = "https://cdn.bigmodel.cn/agent-demos/lark/113123.mov"
    
    data = {
        "model": DEFAULT_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "video_url",
                        "video_url": {"url": video_url}
                    },
                    {
                        "type": "text",
                        "text": "视频中有几个人？他们在做什么？"
                    }
                ]
            }
        ],
        "temperature": 0.5,
        "stream": False
    }
    
    print(f"\n📤 发送视频问答请求...")
    print(f"  问题: {data['messages'][0]['content'][1]['text']}")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=180)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 回答:\n{content}")
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def video_summarization():
    """视频摘要"""
    print("\n" + "="*60)
    print("🎬 测试 3: 视频摘要生成")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    video_url = "https://cdn.bigmodel.cn/agent-demos/lark/113123.mov"
    
    data = {
        "model": DEFAULT_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "video_url",
                        "video_url": {"url": video_url}
                    },
                    {
                        "type": "text",
                        "text": "请为这个视频生成一段摘要，包含主要内容和关键点"
                    }
                ]
            }
        ],
        "temperature": 0.6,
        "stream": False
    }
    
    print(f"\n📤 生成视频摘要...")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=180)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 视频摘要:\n{content}")
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def video_with_context():
    """带上下文的视频对话"""
    print("\n" + "="*60)
    print("🎬 测试 4: 视频多轮对话")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    video_url = "https://cdn.bigmodel.cn/agent-demos/lark/113123.mov"
    
    # 第一轮：先看视频
    conversation = [
        {
            "role": "user",
            "content": [
                {"type": "video_url", "video_url": {"url": video_url}},
                {"type": "text", "text": "我看完了这个视频"}
            ]
        }
    ]
    
    print(f"\n👤 用户: [发送视频] 我看完了这个视频")
    
    response1 = requests.post(url, headers=get_headers(), json={
        "model": DEFAULT_VISION_MODEL,
        "messages": conversation,
        "stream": False
    }, timeout=180)
    
    if response1.status_code == 200:
        reply1 = response1.json()['choices'][0]['message']['content']
        conversation.append({"role": "assistant", "content": reply1})
        print(f"🤖 AI: {reply1[:100]}...")
        
        # 第二轮：基于视频的追问
        conversation.append({
            "role": "user",
            "content": "视频里提到了哪些关键信息？"
        })
        
        print(f"\n👤 用户: 视频里提到了哪些关键信息？")
        
        response2 = requests.post(url, headers=get_headers(), json={
            "model": DEFAULT_VISION_MODEL,
            "messages": conversation,
            "stream": False
        }, timeout=180)
        
        if response2.status_code == 200:
            reply2 = response2.json()['choices'][0]['message']['content']
            print(f"🤖 AI: {reply2}")

if __name__ == '__main__':
    print("\n🚀 智谱 AI - 视频理解示例")
    print(f"使用视觉模型: {DEFAULT_VISION_MODEL}")
    print("⚠️  注意: 视频处理较慢，每个请求可能需要 30-180 秒\n")
    
    # 由于视频处理很慢，默认只运行第一个测试
    video_understanding()
    
    # 取消下面的注释来运行更多测试
    # video_qa()
    # video_summarization()
    # video_with_context()
    
    print("\n" + "="*60)
    print("✅ 视频理解测试完成!")
    print("="*60)
