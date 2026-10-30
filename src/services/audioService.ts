/**
 * Audio streaming service handling:
 * - 16kHz PCM16 mic input recording & base64 encoding for Gemini Live
 * - 24kHz PCM16 output decoding & gapless playback scheduling
 * - Fast interruption flush (clearing audio queue on user speech)
 * - AnalyserNode export for live waveform visualization
 */

export class ZoyaAudioService {
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;

  private nextStartTime: number = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];
  private onAudioChunkCallback?: (base64Pcm16: string) => void;
  private onUserSpeakingCallback?: (amplitude: number) => void;

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Initializes microphone capture at 16kHz
   */
  async startRecording(
    onAudioChunk: (base64Pcm16: string) => void,
    onUserSpeaking?: (amplitude: number) => void
  ): Promise<void> {
    this.onAudioChunkCallback = onAudioChunk;
    this.onUserSpeakingCallback = onUserSpeaking;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
    await this.inputAudioContext.resume();

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    this.analyser = this.inputAudioContext.createAnalyser();
    this.analyser.fftSize = 128;

    // 4096 buffer size at 16kHz is ~256ms chunk
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    source.connect(this.analyser);
    this.analyser.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);

    this.scriptProcessor.onaudioprocess = (e) => {
      const channelData = e.inputBuffer.getChannelData(0);

      // Measure amplitude
      let maxVal = 0;
      for (let i = 0; i < channelData.length; i++) {
        const val = Math.abs(channelData[i]);
        if (val > maxVal) maxVal = val;
      }
      this.onUserSpeakingCallback?.(maxVal);

      // Convert Float32Array to 16-bit PCM (little-endian)
      const pcm16 = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Convert to Base64
      const bytes = new Uint8Array(pcm16.buffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      this.onAudioChunkCallback?.(base64);
    };
  }

  /**
   * Plays a 24kHz raw PCM16 base64 chunk from Gemini Live
   */
  playPcmChunk(base64Data: string): void {
    if (!this.outputAudioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 });
    }

    if (this.outputAudioContext.state === 'suspended') {
      this.outputAudioContext.resume();
    }

    try {
      const binary = atob(base64Data);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const audioBuffer = this.outputAudioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const sourceNode = this.outputAudioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.outputAudioContext.destination);

      const currentTime = this.outputAudioContext.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.04;
      }

      sourceNode.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      this.activeSourceNodes.push(sourceNode);
      sourceNode.onended = () => {
        const index = this.activeSourceNodes.indexOf(sourceNode);
        if (index > -1) {
          this.activeSourceNodes.splice(index, 1);
        }
      };
    } catch (err) {
      console.error('Error playing PCM audio chunk:', err);
    }
  }

  /**
   * Instantly stops any playing audio when interrupted by user
   */
  handleInterruption(): void {
    for (const node of this.activeSourceNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {
        // ignore
      }
    }
    this.activeSourceNodes = [];
    if (this.outputAudioContext) {
      this.nextStartTime = this.outputAudioContext.currentTime;
    }
  }

  /**
   * Optional sassy speech synthesis fallback if Live audio is offline
   */
  speakTextSassy(text: string, onStart?: () => void, onEnd?: () => void): void {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Find lively female voice if possible
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      (v) =>
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.name.includes('Samantha') ||
        v.name.includes('Victoria') ||
        v.name.includes('Female')
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    utterance.pitch = 1.15; // slightly energetic, youthful
    utterance.rate = 1.05; // snappy banter rate

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);
  }

  stopAll(): void {
    this.handleInterruption();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close().catch(() => {});
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close().catch(() => {});
      this.outputAudioContext = null;
    }
  }
}
