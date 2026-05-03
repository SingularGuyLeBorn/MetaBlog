const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PIPER_EXE = path.join(process.cwd(), "tools", "piper", "piper.exe");
const PIPER_MODEL = path.join(process.cwd(), "tools", "piper", "zh_CN-huayan-medium.onnx");
const WHISPER_EXE = path.join(process.cwd(), "tools", "whisper", "whisper-cli.exe");
const WHISPER_MODEL = path.join(process.cwd(), "tools", "whisper", "ggml-tiny.bin");
const OUTPUT_WAV = path.join(process.cwd(), "tools", "test-output.wav");

function log(msg, color) {
  const c = { green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m", reset: "\x1b[0m" };
  console.log((c[color] || "") + msg + c.reset);
}

async function testTTS() {
  log("=== Testing Piper TTS ===", "cyan");
  const text = "Hello world, this is a voice synthesis test.";
  log("Input: " + text);
  return new Promise((resolve) => {
    const proc = spawn(PIPER_EXE, ["--model", PIPER_MODEL, "--output_file", OUTPUT_WAV], { shell: true });
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.stdin.write(text, "utf-8", () => proc.stdin.end());
    proc.on("close", (code) => {
      if (code !== 0) { log("Piper exit code: " + code, "red"); log(stderr, "red"); resolve(false); return; }
      if (!fs.existsSync(OUTPUT_WAV)) { log("No output file", "red"); resolve(false); return; }
      const size = fs.statSync(OUTPUT_WAV).size;
      log("TTS OK! Output: " + OUTPUT_WAV + " (" + Math.round(size / 1024) + " KB)", "green");
      resolve(true);
    });
  });
}

async function testASR() {
  log("=== Testing Whisper ASR ===", "cyan");
  if (!fs.existsSync(OUTPUT_WAV)) { log("Skip: no audio file", "yellow"); return false; }
  const jsonPath = OUTPUT_WAV + ".json";
  return new Promise((resolve) => {
    const proc = spawn(WHISPER_EXE, ["-m", WHISPER_MODEL, "-f", OUTPUT_WAV, "-l", "en", "--output-json", "--no-prints"], { shell: true });
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", () => {
      let text = "";
      try {
        if (fs.existsSync(jsonPath)) {
          const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
          if (raw.transcription && Array.isArray(raw.transcription)) {
            text = raw.transcription.map((s) => s.text?.trim()).filter(Boolean).join("");
          } else if (raw.text) { text = raw.text.trim(); }
          fs.unlinkSync(jsonPath);
        }
      } catch (e) { log("JSON parse error: " + e.message, "yellow"); }
      if (text) { log("ASR OK! Result: " + text, "green"); resolve(true); }
      else { log("ASR: no text recognized", "yellow"); resolve(false); }
    });
  });
}

(async () => {
  const ttsOk = await testTTS();
  const asrOk = ttsOk ? await testASR() : false;
  if (fs.existsSync(OUTPUT_WAV)) fs.unlinkSync(OUTPUT_WAV);
  log("", "reset");
  log("========================================", "cyan");
  if (ttsOk && asrOk) log("ALL TESTS PASSED", "green");
  else if (ttsOk) log("TTS OK, ASR failed", "yellow");
  else log("TTS failed", "red");
  log("========================================", "cyan");
})();
