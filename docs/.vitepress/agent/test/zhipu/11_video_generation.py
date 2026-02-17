"""
11. 视频生成示例
使用 CogVideoX 生成视频
"""
import requests
import time
from config import ZHIPU_BASE_URL, get_headers, check_api_key, DEFAULT_VIDEO_MODEL

def generate_video():
    """生成视频"""
    print("\n" + "="*60)
    print("🎬 测试 1: 文本生成视频")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/videos/generations"
    
    data = {
        "model": DEFAULT_VIDEO_MODEL,  # cogvideox-flash
        "prompt": "一只大熊猫在竹林中悠闲地吃竹子，阳光透过树叶洒落，自然光线",
        "size": "1920x1080",  # 分辨率
        "fps": 30,  # 帧率
        "duration": 5  # 时长(秒)
    }
    
    print(f"\n📤 发送请求:")
    print(f"  模型: {DEFAULT_VIDEO_MODEL}")
    print(f"  提示词: {data['prompt']}")
    print(f"  分辨率: {data['size']}")
    print(f"  帧率: {data['fps']}fps")
    print(f"  时长: {data['duration']}秒")
    
    print("\n⏳ 视频生成需要较长时间，请耐心等待...")
    
    try:
        response = requests.post(
            url,
            headers=get_headers(),
            json=data,
            timeout=300  # 视频生成需要更长时间
        )
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"\n📥 提交成功:")
            print(f"  任务ID: {result.get('id', 'N/A')}")
            print(f"  状态: {result.get('status', 'unknown')}")
            
            if 'url' in result:
                print(f"  🎬 视频URL: {result['url']}")
            else:
                print(f"\n  ⏳ 视频生成中...")
                print(f"  请稍后使用任务ID查询结果")
                print(f"  查询接口: GET /videos/{result.get('id')}")
                
        else:
            print(f"\n❌ 请求失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def check_video_status():
    """查询视频生成状态"""
    print("\n" + "="*60)
    print("🎬 测试 2: 查询视频状态")
    print("="*60)
    
    print("""
💡 视频生成是异步的，提交后需要查询状态

查询接口:
  GET /paas/v4/videos/{video_id}

状态说明:
  - PROCESSING: 处理中
  - SUCCESS: 生成成功
  - FAILED: 生成失败

Python 示例:
    import time
    
    video_id = "your-video-id"
    
    while True:
        response = requests.get(
            f"{base_url}/videos/{video_id}",
            headers=headers
        )
        result = response.json()
        
        if result['status'] == 'SUCCESS':
            print(f"视频生成成功: {result['url']}")
            break
        elif result['status'] == 'FAILED':
            print(f"生成失败: {result.get('error')}")
            break
        else:
            print("处理中，10秒后重试...")
            time.sleep(10)
""")

def image_to_video():
    """图生视频"""
    print("\n" + "="*60)
    print("🎬 测试 3: 图片生成视频 (Image to Video)")
    print("="*60)
    
    print("""
💡 CogVideoX-3 支持图生视频

请求示例:
    {
        "model": "cogvideox-3",
        "prompt": "让画面动起来，微风吹动树叶",
        "image_url": "https://example.com/image.jpg",
        "size": "1920x1080",
        "duration": 5
    }

支持的功能:
- 首帧生视频: 提供图片，AI 补全后续画面
- 首尾帧生视频: 提供第一张和最后一张，AI 补全过程
- 动态化: 让静态图片产生动态效果

注意: cogvideox-flash 可能不支持图生视频，
      需要使用 cogvideox-3 或其他付费模型
""")

def video_style_examples():
    """视频风格提示词示例"""
    print("\n" + "="*60)
    print("🎬 测试 4: 视频风格提示词示例")
    print("="*60)
    
    examples = [
        ("自然风光", "清晨的森林，阳光透过树叶洒下，薄雾弥漫，摄像机缓慢推进"),
        ("城市夜景", "繁华都市夜景，霓虹灯闪烁，车水马龙，航拍视角缓慢下降"),
        ("科幻场景", "未来太空站内部，全息屏幕闪烁，机器人行走，电影级光影"),
        ("美食特写", "热气腾腾的火锅，食材落入锅中，慢动作镜头，蒸汽缭绕"),
        ("人物动作", "舞者在舞台上旋转，裙摆飞扬，聚光灯跟随，优雅流畅")
    ]
    
    print("\n💡 推荐的视频提示词:")
    for style, prompt in examples:
        print(f"\n  【{style}】")
        print(f"    {prompt}")
    
    print("\n⚠️  提示: 加上镜头运动描述（如'缓慢推进'、'旋转'）会让视频更有动感")

def video_parameters():
    """视频参数说明"""
    print("\n" + "="*60)
    print("🎬 测试 5: 视频参数详解")
    print("="*60)
    
    print("""
📋 视频生成参数说明

必需参数:
  - model: 模型名称 (cogvideox-flash, cogvideox-3)
  - prompt: 文本描述

可选参数:
  - size: 分辨率
    * 1920x1080 (1080p)
    * 1280x720 (720p)
    * 1024x576
    * 默认: 1920x1080
  
  - fps: 帧率 (frames per second)
    * 30: 流畅
    * 60: 更流畅 ( cogvideox-flash 支持)
    * 默认: 30
  
  - duration: 时长（秒）
    * cogvideox-flash: 最长 10 秒
    * cogvideox-3: 最长 6 秒
    * 默认: 5
  
  - image_url: 首帧图片（图生视频时使用）
  
  - callback_url: 回调地址，生成完成后通知你

💰 免费模型 cogvideox-flash 的限制:
  - 分辨率: 最高 1920x1080
  - 时长: 最长 10 秒
  - 可能有每日生成次数限制

⏱️ 生成时间:
  - 通常需要 1-5 分钟
  - 取决于视频长度和复杂度
""")

if __name__ == '__main__':
    print("\n🚀 智谱 AI - 视频生成示例")
    print(f"使用模型: {DEFAULT_VIDEO_MODEL}")
    print("⚠️  注意: 视频生成耗时较长，请耐心等待\n")
    
    # 默认不运行实际生成（太慢了）
    # generate_video()
    
    # 显示说明文档
    print("💡 视频生成功能说明:\n")
    check_video_status()
    image_to_video()
    video_style_examples()
    video_parameters()
    
    print("\n" + "="*60)
    print("如需实际测试视频生成，请取消注释 generate_video() 调用")
    print("="*60)
