/**
 * ============================================================================
 * 一键下载语音模型脚本
 * ============================================================================
 *
 * 自动下载 Piper TTS 和 Whisper.cpp ASR 所需的二进制文件与模型.
 * 支持 Windows 平台,运行前无需手动准备任何文件.
 *
 * 用法:
 *   node scripts/download-voice-models.cjs
 *   node scripts/download-voice-models.cjs --force  # 强制重新下载
 *
 * 下载内容:
 *   - vendor/piper/piper.exe          (Piper TTS 引擎)
 *   - vendor/piper/zh_CN-huayan-medium.onnx     (中文语音模型)
 *   - vendor/piper/zh_CN-huayan-medium.onnx.json (模型配置)
 *   - vendor/whisper/whisper-cli.exe  (Whisper.cpp ASR 引擎)
 *   - vendor/whisper/ggml-tiny.bin    (Whisper 识别模型,约 39MB)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const FORCE = process.argv.includes("--force");

// ─── 配置 ───
const DOWNLOADS = [
  {
    name: "Piper Windows 可执行文件",
    url: "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip",
    destDir: path.join(process.cwd(), "vendor", "piper"),
    destFile: "piper.exe",
    isZip: true,
    zipEntry: "piper.exe",
  },
  {
    name: "Piper 中文语音模型",
    url: "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx",
    destDir: path.join(process.cwd(), "vendor", "piper"),
    destFile: "zh_CN-huayan-medium.onnx",
    isZip: false,
  },
  {
    name: "Piper 中文模型配置",
    url: "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx.json",
    destDir: path.join(process.cwd(), "vendor", "piper"),
    destFile: "zh_CN-huayan-medium.onnx.json",
    isZip: false,
  },
  {
    name: "Whisper.cpp Windows 可执行文件",
    url: "https://github.com/ggerganov/whisper.cpp/releases/download/v1.7.5/whisper-bin-x64.zip",
    destDir: path.join(process.cwd(), "vendor", "whisper"),
    destFile: "whisper-cli.exe",
    isZip: true,
    zipEntry: "whisper-cli.exe",
  },
  {
    name: "Whisper Tiny 模型",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
    destDir: path.join(process.cwd(), "vendor", "whisper"),
    destFile: "ggml-tiny.bin",
    isZip: false,
  },
];

// ─── 工具函数 ───

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[+] 创建目录: ${dir}`);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 优先使用系统 curl 下载(Windows 10+ / Linux / macOS 内置),
 * 速度通常比 Node.js https 模块快且更稳定.
 * 回退到 Node.js https 模块.
 */
function hasCurl() {
  try {
    require("child_process").execSync("curl --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const USE_CURL = hasCurl();

function downloadWithCurl(url, destPath) {
  return new Promise((resolve, reject) => {
    // -L: 跟随重定向, -o: 输出文件, --progress-bar: 显示进度
    const proc = spawn("curl", ["-L", "-o", destPath, "--progress-bar", "-A", "Mozilla/5.0", url], {
      stdio: "inherit",
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`curl 退出码 ${code}`));
    });
    proc.on("error", reject);
  });
}

function downloadWithNode(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let downloaded = 0;
    let total = 0;

    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          console.log(`    ↳ 重定向到: ${response.headers.location.substring(0, 80)}...`);
          downloadWithNode(response.headers.location, destPath).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        total = parseInt(response.headers["content-length"] || "0", 10);

        response.on("data", (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const percent = Math.round((downloaded / total) * 100);
            process.stdout.write(`    ↳ 进度: ${percent}% (${formatBytes(downloaded)} / ${formatBytes(total)})\r`);
          }
        });

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          process.stdout.write("\n");
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
  });
}

function downloadFile(url, destPath) {
  if (USE_CURL) {
    return downloadWithCurl(url, destPath);
  }
  return downloadWithNode(url, destPath);
}

function extractZip(zipPath, entryName, destDir, destFile) {
  return new Promise((resolve, reject) => {
    const tmpExtractDir = `${zipPath}_extract`;
    ensureDir(tmpExtractDir);

    // 使用 PowerShell Expand-Archive 解压
    const ps = spawn("powershell.exe", [
      "-Command",
      `Expand-Archive -Path '${zipPath}' -DestinationPath '${tmpExtractDir}' -Force`,
    ]);

    ps.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`PowerShell 解压失败 (exit ${code})`));
        return;
      }

      // 在解压目录中查找目标文件
      const findFile = (dir, target) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const found = findFile(fullPath, target);
            if (found) return found;
          } else if (entry.name.toLowerCase() === target.toLowerCase()) {
            return fullPath;
          }
        }
        return null;
      };

      const found = findFile(tmpExtractDir, entryName);
      if (!found) {
        reject(new Error(`在压缩包中未找到 ${entryName}`));
        return;
      }

      const finalPath = path.join(destDir, destFile);
      fs.copyFileSync(found, finalPath);

      // 清理临时文件
      fs.rmSync(tmpExtractDir, { recursive: true, force: true });
      fs.unlinkSync(zipPath);

      resolve(finalPath);
    });

    ps.on("error", reject);
  });
}

// ─── 主流程 ───

async function main() {
  console.log("========================================");
  console.log("  MetaBlog 语音模型一键下载工具");
  console.log("========================================\n");

  if (process.platform !== "win32") {
    console.log("⚠️  当前脚本针对 Windows 平台优化. Linux/macOS 用户请手动下载对应版本:");
    console.log("   Piper: https://github.com/rhasspy/piper/releases");
    console.log("   Whisper.cpp: https://github.com/ggerganov/whisper.cpp/releases");
    console.log("");
  }

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const item of DOWNLOADS) {
    ensureDir(item.destDir);
    const finalPath = path.join(item.destDir, item.destFile);

    console.log(`[${successCount + skipCount + failCount + 1}/${DOWNLOADS.length}] ${item.name}`);
    console.log(`    目标: ${finalPath}`);

    if (!FORCE && fs.existsSync(finalPath)) {
      const size = fs.statSync(finalPath).size;
      console.log(`    ✓ 已存在 (${formatBytes(size)}), 跳过 (加 --force 可强制重下)\n`);
      skipCount++;
      continue;
    }

    const tmpPath = `${finalPath}.tmp`;

    try {
      await downloadFile(item.url, tmpPath);

      if (item.isZip) {
        console.log(`    ↳ 解压中...`);
        await extractZip(tmpPath, item.zipEntry, item.destDir, item.destFile);
      } else {
        fs.renameSync(tmpPath, finalPath);
      }

      const size = fs.statSync(finalPath).size;
      console.log(`    ✓ 完成 (${formatBytes(size)})\n`);
      successCount++;
    } catch (err) {
      console.error(`    ✗ 失败: ${err.message}\n`);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      failCount++;
    }
  }

  console.log("========================================");
  console.log(`  下载完成: ${successCount} 成功, ${skipCount} 跳过, ${failCount} 失败`);
  console.log("========================================");

  if (failCount > 0) {
    console.log("\n⚠️  部分文件下载失败,可能原因:");
    console.log("   1. 网络问题(GitHub/HuggingFace 访问不稳定)");
    console.log("   2. release 版本更新导致 URL 失效");
    console.log("   3. 可尝试开启代理后重新运行本脚本\n");
    process.exit(1);
  }

  console.log("\n✅ 所有文件已就绪! 请检查 .env 中的路径配置:");
  console.log(`   PIPER_PATH=${path.join("vendor", "piper", "piper.exe")}`);
  console.log(`   PIPER_MODEL_PATH=${path.join("vendor", "piper", "zh_CN-huayan-medium.onnx")}`);
  console.log(`   WHISPER_CLI_PATH=${path.join("vendor", "whisper", "whisper-cli.exe")}`);
  console.log(`   WHISPER_MODEL_PATH=${path.join("vendor", "whisper", "ggml-tiny.bin")}`);
  console.log("\n🚀 现在可以启动项目并访问 /api/voice/status 检测状态了\n");
}

main().catch((err) => {
  console.error("脚本异常:", err);
  process.exit(1);
});
