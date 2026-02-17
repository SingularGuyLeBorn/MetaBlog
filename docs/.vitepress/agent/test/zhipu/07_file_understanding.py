"""
07. 文件理解示例
分析 PDF、TXT 等文档内容
"""
import requests
from config import ZHIPU_BASE_URL, get_headers, check_api_key, DEFAULT_VISION_MODEL

def file_txt_understanding():
    """理解 TXT 文件"""
    print("\n" + "="*60)
    print("📄 测试 1: TXT 文件理解")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 示例文本文件
    file_url = "https://cdn.bigmodel.cn/static/demo/demo2.txt"
    
    data = {
        "model": DEFAULT_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "file_url",
                        "file_url": {"url": file_url}
                    },
                    {
                        "type": "text",
                        "text": "请总结这个文件的主要内容"
                    }
                ]
            }
        ],
        "temperature": 0.7,
        "stream": False
    }
    
    print(f"\n📤 发送请求:")
    print(f"  文件: {file_url}")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 文件总结:\n{content}")
        else:
            print(f"\n❌ 请求失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def file_pdf_understanding():
    """理解 PDF 文件"""
    print("\n" + "="*60)
    print("📄 测试 2: PDF 文件理解")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 示例 PDF 文件
    file_url = "https://cdn.bigmodel.cn/static/demo/demo1.pdf"
    
    data = {
        "model": DEFAULT_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "file_url",
                        "file_url": {"url": file_url}
                    },
                    {
                        "type": "text",
                        "text": "这个 PDF 讲了什么？提取关键信息"
                    }
                ]
            }
        ],
        "temperature": 0.7,
        "stream": False
    }
    
    print(f"\n📤 发送请求:")
    print(f"  文件: {file_url}")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 PDF 分析:\n{content}")
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def multiple_files_analysis():
    """多文件对比分析"""
    print("\n" + "="*60)
    print("📄 测试 3: 多文件对比分析")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 同时分析两个文件
    data = {
        "model": DEFAULT_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "file_url",
                        "file_url": {"url": "https://cdn.bigmodel.cn/static/demo/demo1.pdf"}
                    },
                    {
                        "type": "file_url",
                        "file_url": {"url": "https://cdn.bigmodel.cn/static/demo/demo2.txt"}
                    },
                    {
                        "type": "text",
                        "text": "比较这两个文件的内容，它们有什么关联？"
                    }
                ]
            }
        ],
        "temperature": 0.7,
        "stream": False
    }
    
    print(f"\n📤 发送两个文件进行对比...")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 对比分析:\n{content}")
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def file_qa():
    """基于文件的问答"""
    print("\n" + "="*60)
    print("📄 测试 4: 文件问答")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    file_url = "https://cdn.bigmodel.cn/static/demo/demo2.txt"
    
    # 先发送文件
    conversation = [
        {
            "role": "user",
            "content": [
                {"type": "file_url", "file_url": {"url": file_url}},
                {"type": "text", "text": "我已经阅读了这份文档"}
            ]
        }
    ]
    
    print(f"\n👤 用户: [发送文件] 我已经阅读了这份文档")
    
    response1 = requests.post(url, headers=get_headers(), json={
        "model": DEFAULT_VISION_MODEL,
        "messages": conversation,
        "stream": False
    }, timeout=60)
    
    if response1.status_code == 200:
        reply1 = response1.json()['choices'][0]['message']['content']
        conversation.append({"role": "assistant", "content": reply1})
        print(f"🤖 AI: {reply1[:100]}...")
        
        # 基于文件内容提问
        conversation.append({
            "role": "user",
            "content": "文档中提到的关键数据有哪些？"
        })
        
        print(f"\n👤 用户: 文档中提到的关键数据有哪些？")
        
        response2 = requests.post(url, headers=get_headers(), json={
            "model": DEFAULT_VISION_MODEL,
            "messages": conversation,
            "stream": False
        }, timeout=60)
        
        if response2.status_code == 200:
            reply2 = response2.json()['choices'][0]['message']['content']
            print(f"🤖 AI: {reply2}")

if __name__ == '__main__':
    print("\n🚀 智谱 AI - 文件理解示例")
    print(f"使用模型: {DEFAULT_VISION_MODEL}")
    print("支持格式: PDF, TXT 等\n")
    
    file_txt_understanding()
    file_pdf_understanding()
    multiple_files_analysis()
    file_qa()
    
    print("\n" + "="*60)
    print("✅ 文件理解测试完成!")
    print("="*60)
