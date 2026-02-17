"""
04. 多轮对话示例
保持上下文记忆，进行连贯的对话
"""
import requests
from config import ZHIPU_BASE_URL, get_headers, check_api_key, DEFAULT_TEXT_MODEL

def multi_turn_conversation():
    """多轮对话演示"""
    print("\n" + "="*60)
    print("💬 测试 1: 多轮对话")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 维护对话历史
    conversation_history = [
        {
            "role": "system",
            "content": "你是一个专业的生活顾问，擅长健康饮食建议。"
        }
    ]
    
    # 第一轮
    user_input1 = "我想减肥，有什么建议吗？"
    conversation_history.append({"role": "user", "content": user_input1})
    
    print(f"\n👤 用户: {user_input1}")
    
    response1 = requests.post(url, headers=get_headers(), json={
        "model": DEFAULT_TEXT_MODEL,
        "messages": conversation_history,
        "temperature": 0.7,
        "stream": False
    }, timeout=60)
    
    if response1.status_code == 200:
        assistant_reply1 = response1.json()['choices'][0]['message']['content']
        conversation_history.append({"role": "assistant", "content": assistant_reply1})
        print(f"\n🤖 AI: {assistant_reply1[:200]}...")
    
    # 第二轮（基于上下文的追问）
    user_input2 = "早餐吃什么比较好？"
    conversation_history.append({"role": "user", "content": user_input2})
    
    print(f"\n👤 用户: {user_input2}")
    print("   (AI应该理解这是在问减肥早餐)")
    
    response2 = requests.post(url, headers=get_headers(), json={
        "model": DEFAULT_TEXT_MODEL,
        "messages": conversation_history,
        "temperature": 0.7,
        "stream": False
    }, timeout=60)
    
    if response2.status_code == 200:
        assistant_reply2 = response2.json()['choices'][0]['message']['content']
        conversation_history.append({"role": "assistant", "content": assistant_reply2})
        print(f"\n🤖 AI: {assistant_reply2[:200]}...")
    
    # 第三轮（更深入的追问）
    user_input3 = "晚餐呢？"
    conversation_history.append({"role": "user", "content": user_input3})
    
    print(f"\n👤 用户: {user_input3}")
    print("   (AI应该继续围绕减肥话题)")
    
    response3 = requests.post(url, headers=get_headers(), json={
        "model": DEFAULT_TEXT_MODEL,
        "messages": conversation_history,
        "temperature": 0.7,
        "stream": False
    }, timeout=60)
    
    if response3.status_code == 200:
        assistant_reply3 = response3.json()['choices'][0]['message']['content']
        print(f"\n🤖 AI: {assistant_reply3[:200]}...")
    
    # 显示完整对话历史
    print("\n📋 完整对话历史:")
    print("-" * 40)
    for msg in conversation_history:
        role = "👤" if msg["role"] == "user" else "🤖" if msg["role"] == "assistant" else "⚙️"
        content = msg["content"][:100] + "..." if len(msg["content"]) > 100 else msg["content"]
        print(f"{role} {msg['role']}: {content}")

def role_playing_chat():
    """角色扮演对话"""
    print("\n" + "="*60)
    print("🎭 测试 2: 角色扮演对话")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 设定角色
    conversation = [
        {
            "role": "system",
            "content": "你是一位经验丰富的Python导师，耐心、幽默，喜欢用生动的比喻解释概念。"
        },
        {
            "role": "user",
            "content": "老师，什么是装饰器？"
        },
        {
            "role": "assistant",
            "content": "哈哈，装饰器啊，你可以把它想象成一个'包装纸'！🎁 就像你送礼物时，会用漂亮的包装纸把礼物包起来，装饰器就是把函数'包'起来，在不改变原函数的情况下，给函数添加一些额外的功能。"
        },
        {
            "role": "user",
            "content": "能举个例子吗？"
        }
    ]
    
    print("\n📋 对话场景: Python 学习")
    for msg in conversation:
        if msg["role"] != "system":
            role = "👤" if msg["role"] == "user" else "🤖"
            print(f"{role} {msg['content'][:80]}...")
    
    print("\n📤 发送请求...")
    
    response = requests.post(url, headers=get_headers(), json={
        "model": DEFAULT_TEXT_MODEL,
        "messages": conversation,
        "temperature": 0.8,
        "stream": False
    }, timeout=60)
    
    if response.status_code == 200:
        reply = response.json()['choices'][0]['message']['content']
        print(f"\n🤖 AI 继续角色扮演:\n{reply}")

def conversation_with_memory_summary():
    """带记忆总结的对话"""
    print("\n" + "="*60)
    print("📝 测试 3: 长对话记忆")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 模拟一个长对话
    conversation = [
        {"role": "system", "content": "你是一个项目管理助手，帮助用户规划和跟踪项目进度。"},
        {"role": "user", "content": "我要开发一个博客系统，用React和Node.js"},
        {"role": "assistant", "content": "好的！React + Node.js 是一个现代的全栈组合。我们可以把项目分解为几个阶段：需求分析、UI设计、前端开发、后端开发、测试部署。你想先从哪个阶段开始？"},
        {"role": "user", "content": "先做前端吧"},
        {"role": "assistant", "content": "前端开发阶段计划：1) 搭建React项目结构 2) 设计组件库 3) 实现页面路由 4) 对接API 5) 优化性能。预计2-3周。"},
        {"role": "user", "content": "用Vite还是CRA？"},
        {"role": "assistant", "content": "推荐Vite！启动快、热更新快、配置简单。CRA已经不太维护了。"},
        {"role": "user", "content": "好的，现在项目进展如何了？"}  # 测试AI是否记得之前的上下文
    ]
    
    print("\n📋 对话上下文 (8条消息):")
    for i, msg in enumerate(conversation):
        if msg["role"] != "system":
            print(f"  {i}. {msg['role']}: {msg['content'][:50]}...")
    
    print(f"\n👤 最新问题: {conversation[-1]['content']}")
    print("   (AI应该记得这是关于博客系统项目，且前端选择了Vite)")
    
    response = requests.post(url, headers=get_headers(), json={
        "model": DEFAULT_TEXT_MODEL,
        "messages": conversation,
        "temperature": 0.7,
        "stream": False
    }, timeout=60)
    
    if response.status_code == 200:
        reply = response.json()['choices'][0]['message']['content']
        print(f"\n🤖 AI 回答:\n{reply}")
        
        # 检查是否提到了之前的上下文
        if 'Vite' in reply or '博客' in reply or '前端' in reply:
            print("\n✅ AI 正确保持了上下文记忆")
        else:
            print("\n⚠️ AI 可能没有充分利用上下文")

if __name__ == '__main__':
    print("\n🚀 智谱 AI - 多轮对话示例")
    print("通过维护 messages 列表实现上下文记忆\n")
    
    multi_turn_conversation()
    role_playing_chat()
    conversation_with_memory_summary()
    
    print("\n" + "="*60)
    print("✅ 多轮对话测试完成!")
    print("="*60)
