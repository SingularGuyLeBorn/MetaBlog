#!/usr/bin/env python3
"""
Monty Python 执行器包装脚本

由 Node.js 后端通过 child_process.spawn 调用，使用 pydantic-monty
安全执行 LLM 生成的 Python 代码。

安全特性：
- Monty 解释器完全隔离宿主机(无文件系统、网络、环境变量访问)
- 仅支持 Python 子集(无 import、无类定义、无第三方库)
- 资源限制由 Node.js 层控制(超时、内存)
"""

import sys
import json

try:
    import pydantic_monty as monty
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "pydantic-monty not installed. Run: pip install pydantic-monty"
    }, ensure_ascii=False))
    sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python monty-runner.py <code> [inputs_json]"
        }, ensure_ascii=False))
        sys.exit(1)

    raw_code = sys.argv[1]
    inputs_json = sys.argv[2] if len(sys.argv) > 2 else "{}"

    try:
        inputs = json.loads(inputs_json)
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Invalid inputs JSON: {e}"
        }, ensure_ascii=False))
        sys.exit(1)

    try:
        m = monty.Monty(raw_code, inputs=list(inputs.keys()))
        result = m.run(inputs=inputs)

        print(json.dumps({
            "success": True,
            "result": result,
        }, ensure_ascii=False, default=str))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
        }, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
