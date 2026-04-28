#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PaddleOCR CLI - 供 Node.js 后端通过子进程调用

用法:
    python paddleocr_cli.py <image_path> [language]

输出: JSON 格式到 stdout
"""

import sys
import json
import time
import os

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python paddleocr_cli.py <image_path> [language]"
        }, ensure_ascii=False))
        sys.exit(1)

    image_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "ch"

    if not os.path.exists(image_path):
        print(json.dumps({
            "success": False,
            "error": f"File not found: {image_path}"
        }, ensure_ascii=False))
        sys.exit(1)

    from paddleocr import PaddleOCR

    start = time.time()
    try:
        # 单例缓存，避免每次调用都重新加载模型
        if not hasattr(main, '_ocr_instance'):
            main._ocr_instance = PaddleOCR(
                lang=language,
                use_gpu=False,
                show_log=False,
            )
        ocr = main._ocr_instance

        # PaddleOCR 2.x API: ocr()
        result = ocr.ocr(image_path, cls=True)

        lines = []
        if result and result[0]:
            for line in result[0]:
                text, confidence = line[1]
                lines.append({
                    "text": text,
                    "confidence": round(float(confidence), 4)
                })

        full_text = "\n".join([l["text"] for l in lines])
        elapsed = time.time() - start

        print(json.dumps({
            "success": True,
            "data": {
                "text": full_text,
                "lines": lines,
                "engine": "PaddleOCR",
                "language": language,
                "elapsed_ms": round(elapsed * 1000, 1)
            }
        }, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
