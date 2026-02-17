"""
10. 图像生成示例
使用 CogView 生成图片
"""
import requests
import time
from config import ZHIPU_BASE_URL, get_headers, check_api_key, DEFAULT_IMAGE_MODEL

def generate_image():
    """生成单张图片"""
    print("\n" + "="*60)
    print("🎨 测试 1: 文本生成图片")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/images/generations"
    
    data = {
        "model": DEFAULT_IMAGE_MODEL,  # cogview-3-flash
        "prompt": "一只可爱的猫咪坐在窗台上，阳光洒在它身上，宫崎骏动画风格",
        "n": 1,  # 生成数量
        "size": "1024x1024",  # 图片尺寸
        "response_format": "url"  # 返回 URL
    }
    
    print(f"\n📤 发送请求:")
    print(f"  模型: {DEFAULT_IMAGE_MODEL}")
    print(f"  提示词: {data['prompt']}")
    print(f"  尺寸: {data['size']}")
    
    try:
        response = requests.post(
            url,
            headers=get_headers(),
            json=data,
            timeout=120
        )
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"\n📥 生成结果:")
            if 'data' in result and len(result['data']) > 0:
                image_url = result['data'][0].get('url')
                print(f"  ✅ 图片生成成功!")
                print(f"  🖼️  URL: {image_url}")
                print(f"\n  💡 可复制 URL 到浏览器查看图片")
            else:
                print(f"  ⚠️  未找到图片数据: {result}")
        else:
            print(f"\n❌ 请求失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def generate_multiple_images():
    """一次生成多张图片"""
    print("\n" + "="*60)
    print("🎨 测试 2: 批量生成图片")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/images/generations"
    
    data = {
        "model": DEFAULT_IMAGE_MODEL,
        "prompt": "未来科技城市，霓虹灯，赛博朋克风格",
        "n": 2,  # 生成 2 张
        "size": "1024x1024",
        "response_format": "url"
    }
    
    print(f"\n📤 发送请求 (生成 {data['n']} 张图片)...")
    print(f"  提示词: {data['prompt']}")
    
    try:
        response = requests.post(url, headers=get_headers(), json=data, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"\n📥 生成结果:")
            if 'data' in result:
                for i, img in enumerate(result['data'], 1):
                    url = img.get('url', 'N/A')
                    print(f"  🖼️  图片 {i}: {url}")
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")

def different_sizes():
    """不同尺寸的图片"""
    print("\n" + "="*60)
    print("🎨 测试 3: 不同尺寸")
    print("="*60)
    
    if not check_api_key():
        return
    
    url = f"{ZHIPU_BASE_URL}/images/generations"
    
    sizes = ["768x1344", "1024x1024", "1344x768"]
    
    for size in sizes:
        data = {
            "model": DEFAULT_IMAGE_MODEL,
            "prompt": "山水画，中国传统水墨画风格",
            "n": 1,
            "size": size,
            "response_format": "url"
        }
        
        print(f"\n📤 生成 {size} 尺寸...")
        
        try:
            response = requests.post(url, headers=get_headers(), json=data, timeout=120)
            
            if response.status_code == 200:
                result = response.json()
                if 'data' in result and len(result['data']) > 0:
                    img_url = result['data'][0].get('url', 'N/A')
                    print(f"  ✅ {size}: {img_url[:60]}...")
            else:
                print(f"  ❌ {size}: 失败")
                
        except Exception as e:
            print(f"  ❌ {size}: {str(e)}")

def style_prompts():
    """不同风格的提示词示例"""
    print("\n" + "="*60)
    print("🎨 测试 4: 风格提示词示例")
    print("="*60)
    
    prompts = [
        ("写实风格", "a professional photograph of a golden retriever, high quality, detailed fur, natural lighting"),
        ("动漫风格", "anime girl with long blue hair, cherry blossom background, studio ghibli style"),
        ("油画风格", "oil painting of a sunset over mountains, impressionist style, warm colors, van gogh style"),
        ("像素风格", "pixel art of a cute robot, 8-bit style, retro gaming aesthetic"),
        ("水彩风格", "watercolor painting of flowers, soft colors, artistic, delicate brushstrokes")
    ]
    
    print("\n💡 推荐的风格提示词:")
    for style, prompt in prompts:
        print(f"\n  【{style}】")
        print(f"    {prompt}")
    
    print("\n⚠️  跳过实际生成（节省额度），以上是提示词参考")

def edit_image_info():
    """图像编辑说明"""
    print("\n" + "="*60)
    print("🎨 测试 5: 图像编辑 (CogView-3-Plus)")
    print("="*60)
    
    print("""
💡 CogView-3-Plus 支持图像编辑功能

接口: /paas/v4/images/edits

支持的编辑类型:
1. 局部重绘 (inpainting)
   - 涂抹区域，重新生成
   
2. 图像扩展 (outpainting)
   - 扩展图像边界
   
3. 图像变体
   - 基于参考图生成相似变体

请求示例:
    {
        "model": "cogview-3-plus",
        "image": "base64_encoded_image",
        "prompt": "把背景改成星空",
        "edit_type": "inpainting"
    }

由于需要上传图片，这里仅作说明。
详情请参考智谱官方文档。
""")

if __name__ == '__main__':
    print("\n🚀 智谱 AI - 图像生成示例")
    print(f"使用模型: {DEFAULT_IMAGE_MODEL}")
    print("⚠️  注意: 图像生成消耗额度较多，测试时请注意\n")
    
    generate_image()
    # 取消注释以运行更多测试
    # generate_multiple_images()
    # different_sizes()
    style_prompts()
    edit_image_info()
    
    print("\n" + "="*60)
    print("✅ 图像生成测试完成!")
    print("="*60)
