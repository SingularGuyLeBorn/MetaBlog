"""
08. 音频对话示例
语音输入和输出，实现自然语音交互
"""
import requests
import base64
from config import ZHIPU_BASE_URL, get_headers, check_api_key, DEFAULT_AUDIO_MODEL

def audio_chat_text_input():
    """文本输入，语音输出（简化的文本对话）"""
    print("\n" + "="*60)
    print("🎤 测试 1: 音频模型文本对话")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # glm-4-voice 支持文本输入
    data = {
        "model": DEFAULT_AUDIO_MODEL,  # glm-4-voice
        "messages": [
            {
                "role": "system",
                "content": "你是一个语音助手，回答要口语化、自然。"
            },
            {
                "role": "user",
                "content": "你好，请介绍一下你自己"
            }
        ],
        "temperature": 0.8,
        "stream": False
    }
    
    print(f"\n📤 发送请求:")
    print(f"  模型: {DEFAULT_AUDIO_MODEL}")
    print(f"  输入: {data['messages'][-1]['content']}")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"\n📥 文本回复:\n{content}")
            print("\n💡 注意: 实际语音输出需要使用 WebSocket 实时 API")
            print("   这里只展示文本回复部分")
        else:
            print(f"\n❌ 请求失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def audio_chat_with_audio_input():
    """语音输入示例（需要本地音频文件）"""
    print("\n" + "="*60)
    print("🎤 测试 2: 语音输入")
    print("="*60)
    
    if not check_api_key():
        return
    
    print("\n💡 语音输入示例代码:")
    print("""
    # 1. 读取本地音频文件 (wav 格式)
    with open("input.wav", "rb") as f:
        audio_data = f.read()
    
    # 2. 转为 base64
    audio_base64 = base64.b64encode(audio_data).decode("utf-8")
    
    # 3. 发送请求
    data = {
        "model": "glm-4-voice",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": "这是我的语音问题"},
                {"type": "input_audio", "input_audio": {
                    "data": audio_base64,
                    "format": "wav"
                }}
            ]
        }]
    }
    """)
    
    print("\n⚠️  跳过实际测试（需要本地音频文件）")
    print("请准备 wav 格式的音频文件后测试")

def audio_multimodal_conversation():
    """多模态音频对话"""
    print("\n" + "="*60)
    print("🎤 测试 3: 多模态音频对话")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/chat/completions"
    
    # 结合文本、图片和语音的复杂对话
    print("\n💡 多模态对话示例:")
    print("""
    data = {
        "model": "glm-4-voice",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": "我看这张图，想知道里面的内容"},
                {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}},
                {"type": "input_audio", "input_audio": {
                    "data": "base64_encoded_audio...",
                    "format": "wav"
                }}
            ]
        }]
    }
    """)
    
    print("\n⚠️  多模态测试需要准备图片和音频文件")

def realtime_api_info():
    """实时 API 信息"""
    print("\n" + "="*60)
    print("🎤 测试 4: 实时语音 API (GLM-Realtime)")
    print("="*60)
    
    print("""
💡 GLM-Realtime 是智谱的实时音视频 API

特点:
- WebSocket 连接，实时双向通信
- 支持视频通话功能
- 通话记忆时长长达 2 分钟
- 跨文本、音频和视频实时推理

使用场景:
- 实时语音助手
- 视频通话 AI
- 多模态交互

连接方式:
  wss://open.bigmodel.cn/api/paas/v4/realtime

需要额外参数:
- Authorization: Bearer {API_KEY}
- 音频格式: pcm, wav
- 视频格式: base64 编码的帧

Python 示例需要使用 websockets 库:
  import websockets
  
  async with websockets.connect(uri, extra_headers=headers) as ws:
      # 发送音频/视频帧
      await ws.send(json.dumps({...}))
      # 接收响应
      response = await ws.recv()

由于需要 WebSocket 和音视频流处理，这里仅作说明。
完整示例请参考智谱官方文档。
""")

def tts_demo():
    """语音合成 (TTS) 说明"""
    print("\n" + "="*60)
    print("🎤 测试 5: 语音合成 (TTS)")
    print("="*60)
    
    print("""
💡 智谱提供 GLM-TTS 模型用于语音合成

接口: /paas/v4/async/audio

支持的模型:
- glm-tts: 超拟人语音合成，情感表达增强
- glm-tts-clone: 音色克隆（3秒音频即可）

支持的参数:
- voice: 音色类型
- speed: 语速 (0.5-2.0)
- pitch: 音调
- emotion: 情感 (neutral, happy, sad, angry)

示例请求:
    {
        "model": "glm-tts",
        "input": {"text": "你好，我是智谱AI"},
        "voice": "xiaowen",
        "speed": 1.0
    }

响应: 返回音频文件的 URL

由于 TTS 是异步接口，需要轮询获取结果。
""")

if __name__ == '__main__':
    print("\n🚀 智谱 AI - 音频对话示例")
    print(f"使用模型: {DEFAULT_AUDIO_MODEL}\n")
    
    audio_chat_text_input()
    audio_chat_with_audio_input()
    audio_multimodal_conversation()
    realtime_api_info()
    tts_demo()
    
    print("\n" + "="*60)
    print("✅ 音频对话测试完成!")
    print("="*60)
