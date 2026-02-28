import subprocess
import os
import sys

# 设置环境变量
os.environ['VITE_KIMI_API_KEY'] = 'sk-tkxFpdhGtYivXgurCSWf9mRpBQwovUuwcLHHOrG29wFv7WFm'
os.environ['VITE_KIMI_BASE_URL'] = 'https://api.moonshot.cn/v1'

notebook_dir = r'D:\ALL IN AI\MetaBlog\model-reference\kimi\notebook'
notebooks = [
    '01-基础对话.ipynb',
    '02-流式输出.ipynb', 
    '03-思考模式.ipynb',
    '04-工具调用.ipynb',
    '05-图像理解.ipynb',
    '06-视频理解.ipynb',
    '07-官方工具.ipynb',
    '08-多轮对话.ipynb',
    '09-JSON结构化输出.ipynb',
    'test_kimi_api.ipynb'
]

results = {}

for nb in notebooks:
    input_path = os.path.join(notebook_dir, nb)
    output_path = os.path.join(notebook_dir, nb.replace('.ipynb', '-output.ipynb'))
    
    print(f"\n{'='*60}")
    print(f"Running: {nb}")
    print('='*60)
    
    try:
        result = subprocess.run(
            ['python', '-m', 'papermill', input_path, output_path, '--kernel', 'python3'],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0:
            results[nb] = 'SUCCESS'
            print(f"[SUCCESS] {nb}")
        else:
            results[nb] = 'FAILED'
            print(f"[FAILED] {nb}")
            # 提取错误信息
            if "PapermillExecutionError" in result.stderr:
                lines = result.stderr.split('\n')
                for i, line in enumerate(lines):
                    if "Exception encountered" in line:
                        print(f"   Error: {lines[i:i+5]}")
                        break
    except subprocess.TimeoutExpired:
        results[nb] = 'TIMEOUT'
        print(f"[TIMEOUT] {nb}")
    except Exception as e:
        results[nb] = f'ERROR: {str(e)}'
        print(f"[ERROR] {nb} - {e}")

# 打印汇总
print("\n" + "="*60)
print("SUMMARY")
print("="*60)
for nb, status in results.items():
    icon = "[OK]" if status == "SUCCESS" else "[FAIL]"
    print(f"{icon} {nb}: {status}")

# 保存结果
with open(os.path.join(notebook_dir, 'test_results.txt'), 'w') as f:
    f.write("Notebook Test Results\n")
    f.write("="*60 + "\n\n")
    for nb, status in results.items():
        f.write(f"{nb}: {status}\n")

print(f"\nResults saved to: {os.path.join(notebook_dir, 'test_results.txt')}")
