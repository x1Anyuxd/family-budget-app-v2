/**
 * Speech Recognition Utility - Use Web Speech API for real-time transcription
 * Falls back to manual input if browser doesn't support Web Speech API
 */

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class SpeechRecognizer {
  private recognition: any;
  private isListening = false;
  private transcript = '';
  private isFinal = false;

  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.language = 'zh-CN'; // Chinese
    }
  }

  /**
   * Check if browser supports Web Speech API
   */
  isSupported(): boolean {
    return !!this.recognition;
  }

  /**
   * Start listening for speech
   */
  startListening(onResult: (transcript: string, isFinal: boolean) => void, onError: (error: string) => void): void {
    if (!this.recognition) {
      onError('浏览器不支持语音识别');
      return;
    }

    this.isListening = true;
    this.transcript = '';
    this.isFinal = false;

    this.recognition.onstart = () => {
      console.log('Speech recognition started');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          this.transcript += transcript + ' ';
          this.isFinal = true;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = this.transcript + interimTranscript;
      onResult(currentTranscript, this.isFinal);
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = '语音识别出错';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = '没有检测到语音，请重试';
          break;
        case 'audio-capture':
          errorMessage = '没有检测到麦克风';
          break;
        case 'network':
          errorMessage = '网络错误';
          break;
        case 'permission-denied':
          errorMessage = '麦克风权限被拒绝';
          break;
      }
      
      onError(errorMessage);
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isListening = false;
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
      onError('无法启动语音识别');
    }
  }

  /**
   * Stop listening
   */
  stopListening(): string {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
    return this.transcript.trim();
  }

  /**
   * Abort recognition
   */
  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  /**
   * Get current transcript
   */
  getTranscript(): string {
    return this.transcript.trim();
  }
}

export default SpeechRecognizer;
