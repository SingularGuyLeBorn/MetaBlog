"""
02. 流式调用示例
实时输出，适合长文本生成和聊天场景
"""
import requests
import json
import time
from config import ZHIPU_BASE_URL, get_headers, check_api_key, DEFAULT_TEXT_MODEL

def stream_chat():
    """流式对话调用"""
    print("\n" + "="*60)
    print("🌊 测试 1: 流式对话")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    data = {
        "model": DEFAULT_TEXT_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "你是一个诗人，擅长写优美的现代诗。"
            },
            {
                "role": "user",
                "content": "写一首关于人工智能的短诗，4-6行即可"
            }
        ],
        "temperature": 0.8,
        "stream": True  # 启用流式输出
    }
    
    print(f"\n📤 发送流式请求...")
    print(f"  模型: {DEFAULT_TEXT_MODEL}")
    print(f"  提示: {data['messages'][-1]['content']}")
    print(f"\n📝 实时输出:\n")
    
    full_content = ""
    start_time = time.time()
    
    try:
        response = requests.post(
            url,
            headers=get_headers(),
            json=data,
            stream=True,  # 开启流式接收
            timeout=60
        )
        
        if response.status_code == 200:
            # 逐行读取 SSE 数据
            for line in response.iter_lines(decode_unicode=True):
                if line:
                    # 处理 SSE 格式: data: {...}
                    if line.startswith('data: '):
                        data_str = line[6:]  # 去掉 "data: "
                        
                        if data_str == '[DONE]':
                            break
                        
                        try:
                            chunk = json.loads(data_str)
                            delta = chunk['choices'][0].get('delta', {})
                            content = delta.get('content', '')
                            
                            if content:
                                print(content, end='', flush=True)
                                full_content += content
                                
                        except json.JSONDecodeError:
                            continue
            
            elapsed = time.time() - start_time
            print(f"\n\n⏱️  生成耗时: {elapsed:.2f} 秒")
            print(f"📊 总字数: {len(full_content)}")
            print(f"⚡ 速度: {len(full_content)/elapsed:.1f} 字/秒")
            
        else:
            print(f"\n❌ 请求失败: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def stream_chat_with_thinking():
    """流式输出带思考过程（模拟效果）"""
    print("\n" + "="*60)
    print("🌊 测试 2: 流式输出长文本")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    data = {
        "model": DEFAULT_TEXT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": "请解释什么是机器学习，用通俗易懂的语言，200字左右"
            }
        ],
        "temperature": 0.7,
        "max_tokens": 500,
        "stream": True
    }
    
    print(f"\n📤 发送请求...")
    print(f"📝 实时输出:\n")
    
    # 添加简单的动画效果
    import sys
    
    try:
        response = requests.post(
            url,
            headers=get_headers(),
            json=data,
            stream=True,
            timeout=60
        )
        
        if response.status_code == 200:
            word_count = 0
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
                            word_count += len(content)
                            
                            # 每50字加个进度提示
                            if word_count % 50 == 0:
                                print(f" [{word_count}字]", end='', flush=True)
                                
                    except json.JSONDecodeError:
                        continue
            
            print(f"\n\n✅ 生成完成，共 {word_count} 字")
            
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
            
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def stream_chat_comparison():
    """对比流式和非流式的速度差异"""
    print("\n" + "="*60)
    print("🌊 测试 3: 流式 vs 非流式对比")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    messages = [
        {
            "role": "user",
            "content": "列举5个提高生产力的技巧，每条一句话"
        }
    ]
    
    # 测试非流式
    print("\n📤 测试非流式...")
    start = time.time()
    response = requests.post(
        url,
        headers=get_headers(),
        json={"model": DEFAULT_TEXT_MODEL, "messages": messages, "stream": False},
        timeout=60
    )
    non_stream_time = time.time() - start
    
    if response.status_code == 200:
        print(f"  ✅ 完成，耗时: {non_stream_time:.2f}s")
        non_stream_content = response.json()['choices'][0]['message']['content']
    else:
        print(f"  ❌ 失败")
        return
    
    # 测试流式
    print("\n📤 测试流式...")
    start = time.time()
    response = requests.post(
        url,
        headers=get_headers(),
        json={"model": DEFAULT_TEXT_MODEL, "messages": messages, "stream": True},
        stream=True,
        timeout=60
    )
    
    stream_content = ""
    for line in response.iter_lines(decode_unicode=True):
        if line and line.startswith('data: '):
            data_str = line[6:]
            if data_str == '[DONE]':
                break
            try:
                chunk = json.loads(data_str)
                content = chunk['choices'][0].get('delta', {}).get('content', '')
                stream_content += content
            except:
                continue
    
    stream_time = time.time() - start
    print(f"  ✅ 完成，耗时: {stream_time:.2f}s")
    
    # 对比结果
    print("\n📊 对比结果:")
    print(f"  非流式: {non_stream_time:.2f}s (等待完整响应)")
    print(f"  流式:   {stream_time:.2f}s (首字更快，可实时显示)")
    print(f"  差异:   {abs(non_stream_time - stream_time):.2f}s")
    print(f"  内容一致: {'✅' if len(non_stream_content) == len(stream_content) else '❌'}")

if __name__ == '__main__':
    print("\n🚀 智谱 AI - 流式调用示例")
    print("流式输出适合长文本和实时交互场景\n")
    
    stream_chat()
    stream_chat_with_thinking()
    stream_chat_comparison()
    
    print("\n" + "="*60)
    print("✅ 流式调用测试完成!")
    print("="*60)
