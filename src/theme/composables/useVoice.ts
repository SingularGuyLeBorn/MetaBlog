/**
 * ============================================================================
 * Vue Composable - useVoice
 * ============================================================================
 *
 * 封装浏览器语音功能：录音(MediaRecorder)、ASR(/api/asr)、TTS(/api/tts)
 *
 * @module src/theme/composables
 */


import { ref } from 'vue'

export type VoiceStatus = 'idle' | 'recording' | 'transcribing' | 'speaking'

/**
 * useVoice 组合式函数
 *
 * 提供语音输入(ASR)和语音输出(TTS)的完整封装.
 */
export function useVoice() {
  const status = ref<VoiceStatus>('idle')
  const error = ref<string>('')

  // ── 录音状态 ──
  let mediaRecorder: MediaRecorder | null = null
  let recordedChunks: Blob[] = []
  let audioElement: HTMLAudioElement | null = null

  /**
   * 开始录音
   * 使用 MediaRecorder 录制音频,优先 webm 格式.
   */
  async function startRecording(): Promise<boolean> {
    try {
      error.value = ''
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : ''

      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recordedChunks = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data)
      }

      mediaRecorder.onstop = () => {
        // 停止所有轨道,释放麦克风
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start(100) // 每 100ms 收集一次数据
      status.value = 'recording'
      return true
    } catch (err: any) {
      error.value = err.message || '无法访问麦克风'
      status.value = 'idle'
      return false
    }
  }

  /**
   * 停止录音,返回音频 Blob
   */
  function stopRecording(): Blob | null {
    if (!mediaRecorder || status.value !== 'recording') return null

    mediaRecorder.stop()
    status.value = 'idle'

    const mimeType = mediaRecorder.mimeType || 'audio/webm'
    const blob = new Blob(recordedChunks, { type: mimeType })
    recordedChunks = []
    mediaRecorder = null
    return blob.size > 0 ? blob : null
  }

  /**
   * 上传音频进行语音识别(ASR)
   *
   * @param blob - 录音得到的音频 Blob
   * @param language - 语言代码,默认中文(zh)
   * @returns 识别出的文本
   */
  async function transcribeAudio(blob: Blob, language = 'zh'): Promise<string> {
    if (!blob || blob.size === 0) {
      error.value = '录音为空'
      return ''
    }

    status.value = 'transcribing'
    try {
      const formData = new FormData()
      formData.append('file', blob, 'recording.webm')
      formData.append('language', language)

      const response = await fetch('/api/asr', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (!result.success) {
        error.value = result.error || '识别失败'
        status.value = 'idle'
        return ''
      }

      status.value = 'idle'
      return result.data?.text || ''
    } catch (err: any) {
      error.value = err.message || '网络错误'
      status.value = 'idle'
      return ''
    }
  }

  /**
   * 文本转语音(TTS)并播放
   *
   * @param text - 要朗读的文本
   * @returns 是否成功开始播放
   */
  async function speak(text: string): Promise<boolean> {
    if (!text.trim()) return false

    // 如果正在播放,先停止
    stopSpeaking()

    status.value = 'speaking'
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        error.value = err.error || 'TTS 请求失败'
        status.value = 'idle'
        return false
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      audioElement = new Audio(url)
      audioElement.onended = () => {
        URL.revokeObjectURL(url)
        audioElement = null
        status.value = 'idle'
      }
      audioElement.onerror = () => {
        URL.revokeObjectURL(url)
        audioElement = null
        status.value = 'idle'
      }

      await audioElement.play()
      return true
    } catch (err: any) {
      error.value = err.message || '播放失败'
      status.value = 'idle'
      return false
    }
  }

  /**
   * 停止当前播放
   */
  function stopSpeaking() {
    if (audioElement) {
      audioElement.pause()
      audioElement.src = ''
      audioElement = null
    }
    if (status.value === 'speaking') {
      status.value = 'idle'
    }
  }

  return {
    status,
    error,
    startRecording,
    stopRecording,
    transcribeAudio,
    speak,
    stopSpeaking,
  }
}
