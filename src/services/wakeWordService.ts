/**
 * Local Wake-Word detector for "Zoya".
 * Replicates the Android AudioRecord local wake-word trigger in the browser.
 */

export class WakeWordService {
  private recognition: any = null;
  private isListening: boolean = false;
  private onWakeCallback?: () => void;

  constructor(onWakeWord: () => void) {
    this.onWakeCallback = onWakeWord;
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim().toLowerCase();
          if (
            transcript.includes('zoya') ||
            transcript.includes('zoy') ||
            transcript.includes('soya') ||
            transcript.includes('zoe') ||
            transcript.includes('hey zoya')
          ) {
            console.log('[WakeWord] Wake-word detected in speech:', transcript);
            this.onWakeCallback?.();
            break;
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        // Continuous listening error recovery
        if (this.isListening && event.error !== 'no-speech') {
          setTimeout(() => {
            if (this.isListening) {
              try {
                this.recognition?.start();
              } catch (e) {}
            }
          }, 500);
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          try {
            this.recognition?.start();
          } catch (e) {}
        }
      };
    }
  }

  start() {
    if (this.isListening) return;
    this.isListening = true;
    try {
      this.recognition?.start();
      console.log('[WakeWord] Listening for "Zoya" in background...');
    } catch (e) {
      console.warn('[WakeWord] Could not start speech recognition:', e);
    }
  }

  stop() {
    this.isListening = false;
    try {
      this.recognition?.stop();
    } catch (e) {}
  }

  // Force trigger for simulated background awakenings
  triggerManualWake() {
    this.onWakeCallback?.();
  }
}
