"""
智谱 API 测试配置文件
读取 .env 文件中的 API Key 和配置
"""
import os
import sys
from pathlib import Path

# 尝试加载 .env 文件
try:
    from dotenv import load_dotenv
    # 从项目根目录加载 .env
    root_dir = Path(__file__).resolve().parents[5]  # 回到项目根目录
    env_path = root_dir / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ 已加载配置文件: {env_path}")
    else:
        print(f"⚠️ 未找到 .env 文件: {env_path}")
        print("请复制 .env.example 为 .env 并填写 API Key")
except ImportError:
    print("⚠️ 未安装 python-dotenv，使用环境变量")

# API 配置
ZHIPU_API_KEY = os.getenv('VITE_ZHIPU_API_KEY') or os.getenv('ZHIPU_API_KEY')
ZHIPU_BASE_URL = os.getenv('VITE_ZHIPU_BASE_URL') or 'https://open.bigmodel.cn/api/paas/v4'

# 免费模型配置
FREE_MODELS = {
    # 文本模型
    'text': {
        'glm-4.7-flash': {
            'description': '最新免费基座模型，普惠版本',
            'context': '200K',
            'max_output': '128K'
        },
        'glm-4-flash-250414': {
            'description': '免费版，超长上下文',
            'context': '128K',
            'max_output': '16K'
        }
    },
    # 视觉模型
    'vision': {
        'glm-4.6v-flash': {
            'description': '免费视觉模型，支持工具调用和深度思考',
            'context': '128K',
            'max_output': '32K'
        },
        'glm-4.1v-thinking-flash': {
            'description': '免费视觉推理模型',
            'context': '64K',
            'max_output': '16K'
        },
        'glm-4v-flash': {
            'description': '免费轻量视觉模型',
            'context': '16K',
            'max_output': '1K'
        }
    },
    # 图像生成
    'image': {
        'cogview-3-flash': {
            'description': '免费图像生成模型',
            'features': ['创意丰富', '推理速度快']
        }
    },
    # 视频生成
    'video': {
        'cogvideox-flash': {
            'description': '免费视频生成模型',
            'features': ['沉浸式AI音效', '4K高清', '10秒时长', '60fps']
        }
    },
    # 语音模型
    'audio': {
        'glm-4-voice': {
            'description': '语音对话模型',
            'features': ['实时语音对话', '情感语调调整']
        }
    }
}

# 默认使用的模型
DEFAULT_TEXT_MODEL = 'glm-4.7-flash'
DEFAULT_VISION_MODEL = 'glm-4.6v-flash'
DEFAULT_IMAGE_MODEL = 'cogview-3-flash'
DEFAULT_VIDEO_MODEL = 'cogvideox-flash'
DEFAULT_AUDIO_MODEL = 'glm-4-voice'

def check_api_key():
    """检查 API Key 是否配置"""
    if not ZHIPU_API_KEY:
        print("❌ 错误: 未找到 ZHIPU_API_KEY")
        print("请在 .env 文件中添加: VITE_ZHIPU_API_KEY=your-api-key")
        return False
    print(f"✅ API Key 已配置: {ZHIPU_API_KEY[:8]}...{ZHIPU_API_KEY[-4:]}")
    return True

def get_headers():
    """获取请求头"""
    return {
        'Authorization': f'Bearer {ZHIPU_API_KEY}',
        'Content-Type': 'application/json'
    }

def print_model_info():
    """打印可用模型信息"""
    print("\n" + "="*60)
    print("📋 智谱免费模型清单")
    print("="*60)
    
    for category, models in FREE_MODELS.items():
        print(f"\n【{category.upper()}】")
        for model_name, info in models.items():
            print(f"  • {model_name}")
            print(f"    {info['description']}")
            if 'context' in info:
                print(f"    上下文: {info['context']}, 最大输出: {info['max_output']}")
    
    print("\n" + "="*60)

if __name__ == '__main__':
    # 测试配置
    print_model_info()
    check_api_key()
