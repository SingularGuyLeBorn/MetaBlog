"""
03. 深度思考模式
开启推理能力，让模型更深入地思考问题
"""
import requests
import json
import time
from config import ZHIPU_BASE_URL, get_headers, check_api_key, DEFAULT_TEXT_MODEL

def thinking_mode():
    """基础深度思考"""
    print("\n" + "="*60)
    print("🧠 测试 1: 基础深度思考模式")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    data = {
        "model": DEFAULT_TEXT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": "一个水池有进水管和出水管，单开进水管5小时灌满，单开出水管7小时排空。如果同时打开两个管，几小时能灌满？"
            }
        ],
        "thinking": {
            "type": "enabled"  # 开启深度思考
        },
        "temperature": 0.3,
        "stream": False
    }
    
    print(f"\n📤 发送请求 (开启深度思考)...")
    print(f"  问题: {data['messages'][0]['content']}")
    
    start = time.time()
    
    try:
        response = requests.post(
            url,
            headers=get_headers(),
            json=data,
            timeout=120  # 思考模式可能需要更长时间
        )
        
        elapsed = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 响应结果:")
            print(f"  耗时: {elapsed:.2f} 秒")
            print(f"  回复:\n{content}")
            
            usage = result.get('usage', {})
            print(f"\n📊 Token 统计:")
            print(f"  输入: {usage.get('prompt_tokens', 0)}")
            print(f"  输出: {usage.get('completion_tokens', 0)}")
            print(f"  总计: {usage.get('total_tokens', 0)}")
            
        else:
            print(f"\n❌ 请求失败: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def thinking_vs_normal():
    """对比深度思考和普通模式"""
    print("\n" + "="*60)
    print("🧠 测试 2: 深度思考 vs 普通模式对比")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    question = """
分析以下逻辑问题：
"所有的鸟都会飞。企鹅是鸟。因此企鹅会飞。"
这个推理有什么问题？
""".strip()
    
    print(f"\n❓ 测试问题:\n{question}\n")
    
    # 普通模式
    print("-" * 40)
    print("📤 普通模式 (无思考)...")
    
    normal_data = {
        "model": DEFAULT_TEXT_MODEL,
        "messages": [{"role": "user", "content": question}],
        "temperature": 0.3,
        "stream": False
    }
    
    start = time.time()
    response = requests.post(url, headers=get_headers(), json=normal_data, timeout=60)
    normal_time = time.time() - start
    
    if response.status_code == 200:
        normal_result = response.json()
        normal_content = normal_result['choices'][0]['message']['content']
        normal_tokens = normal_result['usage']['completion_tokens']
        
        print(f"  耗时: {normal_time:.2f}s")
        print(f"  输出: {len(normal_content)} 字")
        print(f"  Tokens: {normal_tokens}")
        print(f"\n📝 普通模式回答:\n{normal_content[:300]}...")
    
    # 思考模式
    print("\n" + "-" * 40)
    print("📤 深度思考模式...")
    
    thinking_data = {
        "model": DEFAULT_TEXT_MODEL,
        "messages": [{"role": "user", "content": question}],
        "thinking": {"type": "enabled"},
        "temperature": 0.3,
        "stream": False
    }
    
    start = time.time()
    response = requests.post(url, headers=get_headers(), json=thinking_data, timeout=120)
    thinking_time = time.time() - start
    
    if response.status_code == 200:
        thinking_result = response.json()
        thinking_content = thinking_result['choices'][0]['message']['content']
        thinking_tokens = thinking_result['usage']['completion_tokens']
        
        print(f"  耗时: {thinking_time:.2f}s")
        print(f"  输出: {len(thinking_content)} 字")
        print(f"  Tokens: {thinking_tokens}")
        print(f"\n📝 深度思考回答:\n{thinking_content[:300]}...")
    
    # 对比
    print("\n" + "=" * 40)
    print("📊 对比总结:")
    print(f"  时间: 普通 {normal_time:.2f}s vs 思考 {thinking_time:.2f}s")
    print(f"  长度: 普通 {len(normal_content)} 字 vs 思考 {len(thinking_content)} 字")
    print(f"  Tokens: 普通 {normal_tokens} vs 思考 {thinking_tokens}")
    print(f"  思考模式通常回答更深入、有推理过程")

def thinking_stream():
    """流式深度思考"""
    print("\n" + "="*60)
    print("🧠 测试 3: 流式深度思考")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    data = {
        "model": DEFAULT_TEXT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": "解释量子计算的基本原理，用通俗的语言"
            }
        ],
        "thinking": {"type": "enabled"},
        "temperature": 0.5,
        "stream": True  # 流式输出
    }
    
    print(f"\n📤 发送流式深度思考请求...")
    print("📝 实时输出:\n")
    
    try:
        response = requests.post(
            url,
            headers=get_headers(),
            json=data,
            stream=True,
            timeout=120
        )
        
        if response.status_code == 200:
            full_content = ""
            for line in response.iter_lines(decode_unicode=True):
                if line and line.startswith('data: '):
                    data_str = line[6:]
                    if data_str == '[DONE]':
                        break
                    
                    try:
                        chunk = json.loads(data_str)
                        content = chunk['choices'][0].get('delta', {}).get('content', '')
                        if content:
                            print(content, end='', flush=True)
                            full_content += content
                    except:
                        continue
            
            print(f"\n\n✅ 完成，共 {len(full_content)} 字")
            
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
            
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def thinking_coding():
    """深度思考写代码"""
    print("\n" + "="*60)
    print("🧠 测试 4: 深度思考写代码")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    data = {
        "model": DEFAULT_TEXT_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "你是一个专业的程序员，写代码时要考虑边界情况和错误处理。"
            },
            {
                "role": "user",
                "content": """写一个 Python 函数，实现二叉树的后序遍历。
要求：
1. 使用递归和非递归两种方法
2. 包含类型注解
3. 考虑空树的情况
4. 添加注释说明"""
            }
        ],
        "thinking": {"type": "enabled"},
        "temperature": 0.2,
        "max_tokens": 2000,
        "stream": False
    }
    
    print(f"\n📤 发送请求 (深度思考写代码)...")
    
    start = time.time()
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=120)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 响应结果:")
            print(f"  耗时: {elapsed:.2f} 秒")
            print(f"  代码长度: {len(content)} 字符")
            print(f"\n📝 生成的代码:\n")
            print(content)
            
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
            
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

if __name__ == '__main__':
    print("\n🚀 智谱 AI - 深度思考模式示例")
    print("开启 thinking 参数可以让模型更深入地推理\n")
    
    thinking_mode()
    thinking_vs_normal()
    thinking_stream()
    thinking_coding()
    
    print("\n" + "="*60)
    print("✅ 深度思考测试完成!")
    print("="*60)
