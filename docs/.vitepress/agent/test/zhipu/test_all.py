"""
一键运行所有智谱 API 测试
"""
import sys
import importlib
import time
from config import print_model_info, check_api_key

def run_test(test_name, module_name, description):
    """运行单个测试"""
    print("\n" + "="*70)
    print(f"🧪 {test_name}: {description}")
    print("="*70)
    
    try:
        # 动态导入模块
        module = importlib.import_module(module_name)
        
        # 如果模块有 main 函数，调用它
        if hasattr(module, '__file__'):
            # 运行模块中的测试函数
            pass
            
        return True
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        return False

def main():
    """主函数"""
    print("\n" + "="*70)
    print("🚀 智谱 AI API 完整测试套件")
    print("="*70)
    print("\n所有测试使用免费模型，请放心运行\n")
    
    # 显示配置信息
    print_model_info()
    
    if not check_api_key():
        print("\n❌ 请先配置 API Key!")
        print("在 .env 文件中添加: VITE_ZHIPU_API_KEY=your-key")
        return
    
    # 测试列表
    tests = [
        ("基础调用", "01_basic_chat", "测试最基本的对话功能"),
        ("流式调用", "02_stream_chat", "测试实时输出"),
        ("深度思考", "03_thinking", "测试推理模式"),
        ("多轮对话", "04_multi_turn", "测试上下文记忆"),
        ("图片理解", "05_image_understanding", "测试视觉能力"),
        ("视频理解", "06_video_understanding", "测试视频分析（慢）"),
        ("文件理解", "07_file_understanding", "测试文档分析"),
        ("音频对话", "08_audio_chat", "测试语音交互"),
        ("函数调用", "09_function_call", "测试工具调用"),
        ("图像生成", "10_image_generation", "测试 CogView"),
        ("视频生成", "11_video_generation", "测试 CogVideoX（慢）"),
    ]
    
    print("\n" + "="*70)
    print("📋 可运行的测试列表:")
    print("="*70)
    for i, (name, module, desc) in enumerate(tests, 1):
        print(f"  {i}. {name:12s} - {desc}")
    
    print("\n" + "="*70)
    print("⚙️  运行选项:")
    print("="*70)
    print("  1. 运行全部测试")
    print("  2. 运行快速测试（跳过视频相关）")
    print("  3. 自定义选择")
    print("  4. 退出")
    
    choice = input("\n请输入选项 (1-4): ").strip()
    
    selected_tests = []
    
    if choice == "1":
        selected_tests = tests
    elif choice == "2":
        # 跳过视频相关（较慢）
        skip_modules = {"06_video_understanding", "11_video_generation"}
        selected_tests = [(n, m, d) for n, m, d in tests if m not in skip_modules]
        print("\n⚡ 快速模式：跳过视频测试（节省时间）")
    elif choice == "3":
        print("\n请输入要运行的测试编号，用逗号分隔（如：1,2,3）:")
        try:
            indices = [int(x.strip()) - 1 for x in input("> ").split(",")]
            selected_tests = [tests[i] for i in indices if 0 <= i < len(tests)]
        except:
            print("❌ 输入无效")
            return
    else:
        print("👋 再见!")
        return
    
    # 运行选中的测试
    print(f"\n🎯 将运行 {len(selected_tests)} 个测试\n")
    time.sleep(1)
    
    results = []
    start_time = time.time()
    
    for name, module, desc in selected_tests:
        print(f"\n{'='*70}")
        print(f"🔄 正在运行: {name}")
        print(f"{'='*70}")
        
        test_start = time.time()
        
        try:
            # 导入并运行模块
            module_obj = importlib.import_module(module)
            
            # 如果模块直接运行测试，它会打印结果
            test_duration = time.time() - test_start
            
            results.append((name, True, test_duration))
            print(f"\n✅ {name} 完成 ({test_duration:.1f}s)")
            
        except Exception as e:
            test_duration = time.time() - test_start
            results.append((name, False, test_duration))
            print(f"\n❌ {name} 失败: {str(e)}")
        
        # 测试间隔，避免触发速率限制
        if name != selected_tests[-1][0]:  # 不是最后一个
            print("\n⏳ 等待 2 秒...")
            time.sleep(2)
    
    # 总结报告
    total_time = time.time() - start_time
    passed = sum(1 for _, success, _ in results if success)
    failed = len(results) - passed
    
    print("\n" + "="*70)
    print("📊 测试报告")
    print("="*70)
    print(f"\n  总计: {len(results)} 个测试")
    print(f"  通过: {passed} ✅")
    print(f"  失败: {failed} ❌")
    print(f"  耗时: {total_time:.1f} 秒")
    
    print("\n  详细结果:")
    for name, success, duration in results:
        status = "✅" if success else "❌"
        print(f"    {status} {name:15s} ({duration:.1f}s)")
    
    print("\n" + "="*70)
    
    if failed == 0:
        print("🎉 所有测试通过!")
    else:
        print(f"⚠️  {failed} 个测试失败，请检查配置")
    
    print("="*70)

def quick_test():
    """快速测试 - 只运行核心功能"""
    print("\n" + "="*70)
    print("⚡ 快速测试模式")
    print("="*70)
    
    if not check_api_key():
        return
    
    # 只运行最快的几个测试
    core_tests = [
        ("01_basic_chat", "基础调用"),
        ("04_multi_turn", "多轮对话"),
        ("09_function_call", "函数调用"),
    ]
    
    for module, name in core_tests:
        print(f"\n🔄 运行: {name}")
        try:
            importlib.import_module(module)
            print(f"✅ {name} 完成")
        except Exception as e:
            print(f"❌ {name} 失败: {e}")
        time.sleep(1)

if __name__ == '__main__':
    import sys
    
    # 检查命令行参数
    if len(sys.argv) > 1:
        if sys.argv[1] == '--quick':
            quick_test()
        elif sys.argv[1] == '--help':
            print("""
使用方法:
  python test_all.py           # 交互式选择测试
  python test_all.py --quick   # 快速测试核心功能
  python test_all.py --help    # 显示帮助
            """)
        else:
            main()
    else:
        main()
