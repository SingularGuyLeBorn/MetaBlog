"""
09. Function Call 示例
让模型调用外部函数/工具，扩展能力边界
"""
import requests
import json
from config import ZHIPU_BASE_URL, get_headers, check_api_key, DEFAULT_TEXT_MODEL

def simple_function_call():
    """简单的函数调用示例"""
    print("\n" + "="*60)
    print("🔧 测试 1: 基础 Function Call")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 定义可用的函数
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "获取指定城市的当前天气信息",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "city": {
                            "type": "string",
                            "description": "城市名称，如北京、上海"
                        },
                        "date": {
                            "type": "string",
                            "description": "日期，格式 YYYY-MM-DD，默认为今天"
                        }
                    },
                    "required": ["city"]
                }
            }
        }
    ]
    
    data = {
        "model": DEFAULT_TEXT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": "今天北京的天气怎么样？"
            }
        ],
        "tools": tools,
        "tool_choice": "auto",  # 让模型自动选择是否调用工具
        "temperature": 0.3,
        "stream": False
    }
    
    print(f"\n📤 发送请求:")
    print(f"  用户: {data['messages'][0]['content']}")
    print(f"  可用工具: get_weather")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            message = result['choices'][0]['message']
            
            print(f"\n📥 模型响应:")
            
            # 检查是否调用了工具
            if 'tool_calls' in message:
                print(f"  ✅ 模型决定调用工具!")
                for tool_call in message['tool_calls']:
                    function = tool_call['function']
                    print(f"\n  函数名: {function['name']}")
                    print(f"  参数: {function['arguments']}")
                    
                    # 解析参数
                    args = json.loads(function['arguments'])
                    print(f"\n  🎭 模拟执行函数...")
                    print(f"    get_weather(city='{args.get('city')}')")
                    
                    # 模拟返回结果
                    mock_result = {
                        "city": args.get('city'),
                        "temperature": "25°C",
                        "weather": "晴朗",
                        "humidity": "45%"
                    }
                    print(f"    返回: {mock_result}")
            else:
                print(f"  文本回复: {message.get('content', '无内容')}")
                
        else:
            print(f"\n❌ 请求失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def multi_function_call():
    """多函数调用"""
    print("\n" + "="*60)
    print("🔧 测试 2: 多函数调用")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 定义多个工具
    tools = [
        {
            "type": "function",
            "function": {
                "name": "search_knowledge",
                "description": "在知识库中搜索相关信息",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "搜索关键词"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "返回结果数量"
                        }
                    },
                    "required": ["query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "calculator",
                "description": "执行数学计算",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "expression": {
                            "type": "string",
                            "description": "数学表达式，如 2+2, sqrt(16)"
                        }
                    },
                    "required": ["expression"]
                }
            }
        }
    ]
    
    data = {
        "model": DEFAULT_TEXT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": "帮我搜索一下强化学习的资料，然后计算 125 乘以 37 的结果"
            }
        ],
        "tools": tools,
        "tool_choice": "auto",
        "stream": False
    }
    
    print(f"\n📤 发送请求:")
    print(f"  用户: {data['messages'][0]['content']}")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            message = result['choices'][0]['message']
            
            if 'tool_calls' in message:
                print(f"\n📥 模型调用了 {len(message['tool_calls'])} 个工具:")
                for tool_call in message['tool_calls']:
                    function = tool_call['function']
                    args = json.loads(function['arguments'])
                    print(f"\n  📌 {function['name']}")
                    print(f"     参数: {args}")
            else:
                print(f"\n  文本回复: {message.get('content', '无')}")
                
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def function_call_with_conversation():
    """带工具的多轮对话"""
    print("\n" + "="*60)
    print("🔧 测试 3: 工具调用的多轮对话")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_stock_price",
                "description": "获取股票价格",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "symbol": {
                            "type": "string",
                            "description": "股票代码"
                        }
                    },
                    "required": ["symbol"]
                }
            }
        }
    ]
    
    # 第一轮：用户提问
    conversation = [
        {"role": "user", "content": "查询一下阿里巴巴的股票价格"}
    ]
    
    print(f"\n👤 用户: {conversation[0]['content']}")
    
    response1 = requests.post(url, headers=get_headers(), json={
        "model": DEFAULT_TEXT_MODEL,
        "messages": conversation,
        "tools": tools,
        "tool_choice": "auto",
        "stream": False
    }, timeout=60)
    
    if response1.status_code == 200:
        result1 = response1.json()
        assistant_message1 = result1['choices'][0]['message']
        
        # 如果模型调用了工具
        if 'tool_calls' in assistant_message1:
            print(f"\n🤖 AI: [调用工具]")
            tool_call = assistant_message1['tool_calls'][0]
            function = tool_call['function']
            args = json.loads(function['arguments'])
            
            print(f"   调用: {function['name']}({args})")
            
            # 模拟执行工具
            tool_result = {
                "symbol": args.get('symbol', 'BABA'),
                "price": 85.42,
                "change": "+1.23%",
                "time": "2024-01-15 15:30:00"
            }
            
            # 将工具结果添加到对话
            conversation.append(assistant_message1)
            conversation.append({
                "role": "tool",
                "content": json.dumps(tool_result),
                "tool_call_id": tool_call['id']
            })
            
            # 第二轮：让模型生成最终回复
            response2 = requests.post(url, headers=get_headers(), json={
                "model": DEFAULT_TEXT_MODEL,
                "messages": conversation,
                "tools": tools,
                "stream": False
            }, timeout=60)
            
            if response2.status_code == 200:
                final_reply = response2.json()['choices'][0]['message']['content']
                print(f"\n🤖 AI: {final_reply}")

def web_search_tool():
    """内置网页搜索工具"""
    print("\n" + "="*60)
    print("🔧 测试 4: Web Search 工具")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 使用内置的 web_search 工具
    tools = [
        {
            "type": "web_search",
            "web_search": {
                "enable": True,
                "search_query": "auto"  # 自动根据用户输入生成搜索词
            }
        }
    ]
    
    data = {
        "model": DEFAULT_TEXT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": "2024年最新的AI大模型有哪些突破？"
            }
        ],
        "tools": tools,
        "temperature": 0.7,
        "stream": False
    }
    
    print(f"\n📤 发送请求 (启用 Web Search)...")
    print(f"  问题: {data['messages'][0]['content']}")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 回复:\n{content[:500]}...")
            
            # 查看搜索结果
            if 'web_search' in result:
                print(f"\n🔍 搜索结果:")
                for item in result['web_search'].get('results', []):
                    print(f"  - {item.get('title')}: {item.get('url')}")
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def retrieval_tool():
    """知识库检索工具"""
    print("\n" + "="*60)
    print("🔧 测试 5: 知识库检索工具")
    print("="*60)
    
    print("""
💡 知识库检索 (Retrieval) 工具

使用场景:
- 在私有知识库中搜索
- 企业文档问答
- 产品手册查询

配置方式:
    {
        "type": "retrieval",
        "retrieval": {
            "knowledge_id": "your-knowledge-id",
            "prompt_template": "从知识库中检索相关信息"
        }
    }

需要先在智谱平台创建知识库。
详情请参考智谱官方文档。
""")

if __name__ == '__main__':
    print("\n🚀 智谱 AI - Function Call 示例")
    print(f"使用模型: {DEFAULT_TEXT_MODEL}\n")
    
    simple_function_call()
    multi_function_call()
    function_call_with_conversation()
    web_search_tool()
    retrieval_tool()
    
    print("\n" + "="*60)
    print("✅ Function Call 测试完成!")
    print("="*60)
