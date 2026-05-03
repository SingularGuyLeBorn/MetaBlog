# vendor/ 目录

本目录存放项目运行所需的外部二进制工具�?AI 模型文件.
这些文件体积较大,**不纳�?Git 版本控制**,由用户按需下载.

---

## 当前包含的工�?
### Piper TTS（文本转语音�?
| 文件 | 说明 | 大小 |
|------|------|------|
| `piper/piper.exe` | Piper 主程�?| ~0.5 MB |
| `piper/*.dll` | 运行依赖（onnxruntime, espeak-ng 等） | ~25 MB |
| `piper/espeak-ng-data/` | 全球语言发音字典 | ~15 MB |
| `piper/zh_CN-huayan-medium.onnx` | 中文语音模型（华艳声音） | ~60 MB |
| `piper/zh_CN-huayan-medium.onnx.json` | 模型配置文件 | ~5 KB |

**下载地址**�?- Piper Windows: https://github.com/rhasspy/piper/releases
- 中文模型: https://huggingface.co/rhasspy/piper-voices/tree/v1.0.0/zh/zh_CN/huayan/medium

### Whisper.cpp ASR（语音转文字�?
| 文件 | 说明 | 大小 |
|------|------|------|
| `whisper/whisper-cli.exe` | Whisper 主程�?| ~0.5 MB |
| `whisper/ggml.dll` | GGML 推理�?| ~1 MB |
| `whisper/ggml-tiny.bin` | Whisper Tiny 模型权重 | ~75 MB |

**下载地址**�?- Whisper.cpp Windows: https://github.com/ggml-org/whisper.cpp/releases
- Tiny 模型: https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-tiny.bin

---

## 一键下�?
项目根目录提供了 PowerShell 下载脚本�?
```powershell
.\download-voice-models.ps1
```

或手动复制上面的下载地址,把文件放到对应子目录即可.
