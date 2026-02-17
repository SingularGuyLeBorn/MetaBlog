"""
01. 基础调用示例
最简单的智谱 API 调用，使用免费模型 glm-4.7-flash
"""
import requests
import json
from config import ZHIPU_BASE_URL, get_headers, check_api_key, DEFAULT_TEXT_MODEL

def basic_chat():
    """基础对话调用"""
    print("\n" + "="*60)
    print("📝 测试 1: 基础对话调用")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 请求体
    data = {
        "model": DEFAULT_TEXT_MODEL,  # 使用免费模型
        "messages": [
            {
                "role": "system",
                "content": "你是一个有帮助的AI助手，回答简洁明了。"
            },
            {
                "role": "user",
                "content": "请介绍一下智谱AI的免费模型有哪些特点？"
            }
        ],
        "temperature": 0.7,
        "max_tokens": 1024,
        "stream": False  # 非流式调用
    }
    
    print(f"\n📤 发送请求:")
    print(f"  模型: {DEFAULT_TEXT_MODEL}")
    print(f"  消息: {data['messages'][-1]['content']}")
    
    try:
        response = requests.post(
            url,
            headers=get_headers(),
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"\n📥 响应结果:")
            print(f"  状态: ✅ 成功")
            print(f"  模型: {result.get('model', 'unknown')}")
            print(f"  回复: {result['choices'][0]['message']['content']}")
            
            # 统计信息
            usage = result.get('usage', {})
            prompt_tokens = usage.get('prompt_tokens', 0)
            completion_tokens = usage.get('completion_tokens', 0)
            total_tokens = usage.get('total_tokens', 0)
            
            print(f"\n📊 Token 统计:")
            print(f"  输入 Tokens: {prompt_tokens}")
            print(f"  输出 Tokens: {completion_tokens}")
            print(f"  总计 Tokens: {total_tokens}")
            
            # 估算成本（免费模型实际成本为0，但显示参考价格）
            # glm-4.7-flash: 输入约 0.0014/1K, 输出约 0.0014/1K
            input_cost = (prompt_tokens / 1000) * 0.0014
            output_cost = (completion_tokens / 1000) * 0.0014
            total_cost = input_cost + output_cost
            
            print(f"\n💰 成本估算: ${total_cost:.6f} (免费模型实际不扣费)")
            
        else:
            print(f"\n❌ 请求失败:")
            print(f"  状态码: {response.status_code}")
            print(f"  错误: {response.text}")
            
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def basic_chat_with_json_mode():
    """JSON 模式调用"""
    print("\n" + "="*60)
    print("📝 测试 2: JSON 模式调用")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    data = {
        "model": DEFAULT_TEXT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": "列出3个中国的大模型公司，用JSON格式返回，包含 name（公司名）、model（代表模型）、feature（特点）字段"
            }
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "stream": False
    }
    
    print(f"\n📤 发送请求 (JSON模式)...")
    
    try:
        response = requests.post(
            url,
            headers=get_headers(),
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 响应结果:")
            print(f"  原始内容: {content[:200]}...")
            
            # 尝试解析 JSON
            try:
                json_content = json.loads(content)
                print(f"\n✅ JSON 解析成功:")
                print(json.dumps(json_content, indent=2, ensure_ascii=False))
            except:
                print(f"\n⚠️ 内容不是标准 JSON，但响应格式已设置为 json_object")
                
        else:
            print(f"\n❌ 请求失败: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def basic_chat_with_stop():
    """带停止词的调用"""
    print("\n" + "="*60)
    print("📝 测试 3: 带停止词")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    data = {
        "model": DEFAULT_TEXT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": "请列举5个中国的城市，每个城市用一行表示"
            }
        ],
        "stop": ["3."],  # 在生成到 "3." 时停止
        "max_tokens": 500,
        "stream": False
    }
    
    print(f"\n📤 发送请求 (停止词: '3.')...")
    print("预期: 只输出前2个城市就停止")
    
    try:
        response = requests.post(
            url,
            headers=get_headers(),
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            finish_reason = result['choices'][0].get('finish_reason', 'unknown')
            
            print(f"\n📥 响应结果:")
            print(f"  停止原因: {finish_reason}")
            print(f"  内容:\n{content}")
            
            if finish_reason == 'stop':
                print("\n✅ 正确触发了停止词")
        else:
            print(f"\n❌ 请求失败: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

if __name__ == '__main__':
    print("\n🚀 智谱 AI - 基础调用示例")
    print(f"使用模型: {DEFAULT_TEXT_MODEL}")
    
    # 运行所有测试
    basic_chat()
    basic_chat_with_json_mode()
    basic_chat_with_stop()
    
    print("\n" + "="*60)
    print("✅ 基础调用测试完成!")
    print("="*60)
