/**
 * Speech Recognition Utility - Use Web Speech API for browsers and Expo Audio for mobile/tablet
 * Supports both web and native platforms
 */

import { Platform } from 'react-native';

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
  private isNative = false;
  private audioRecorder: any = null;

  constructor() {
    // Check if running on native platform (iOS/Android)
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      this.isNative = true;
      this.initializeNativeRecognition();
    } else {
      // Web platform - use Web Speech API
      const SpeechRecognition = (typeof window !== 'undefined') ? (window.SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.language = 'zh-CN'; // Chinese
      }
    }
  }

  /**
   * Initialize native audio recording for mobile/tablet
   */
  private async initializeNativeRecognition() {
    try {
      // Dynamically import Expo Audio for native platforms
      const { Audio } = await import('expo-av');
      this.audioRecorder = Audio;
    } catch (error) {
      console.warn('Failed to initialize native audio recording:', error);
    }
  }

  /**
   * Check if speech recognition is supported
   */
  isSupported(): boolean {
    if (this.isNative) {
      return !!this.audioRecorder;
    }
    return !!this.recognition;
  }

  /**
   * Start listening for speech
   */
  startListening(onResult: (transcript: string, isFinal: boolean) => void, onError: (error: string) => void): void {
    if (this.isNative) {
      this.startNativeListening(onResult, onError);
    } else {
      this.startWebListening(onResult, onError);
    }
  }

  /**
   * Start listening on web platform using Web Speech API
   */
  private startWebListening(onResult: (transcript: string, isFinal: boolean) => void, onError: (error: string) => void): void {
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
   * Start listening on native platform using Expo Audio
   */
  private async startNativeListening(onResult: (transcript: string, isFinal: boolean) => void, onError: (error: string) => void): Promise<void> {
    try {
      if (!this.audioRecorder) {
        onError('设备不支持语音识别');
        return;
      }

      this.isListening = true;
      this.transcript = '';

      // Request microphone permissions
      const permission = await this.audioRecorder.requestPermissionsAsync();
      if (!permission.granted) {
        onError('麦克风权限被拒绝');
        this.isListening = false;
        return;
      }

      // Set audio mode
      await this.audioRecorder.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionMode: this.audioRecorder.InterruptionMode.DoNotMix,
      });

      // Create and start recording
      const { Recording } = this.audioRecorder;
      const recording = new Recording();
      
      await recording.prepareToRecordAsync(this.audioRecorder.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      // Simulate speech recognition by recording for a fixed duration
      const recordingDuration = 5000; // 5 seconds
      setTimeout(async () => {
        try {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          
          // In a real implementation, you would send this audio to a speech-to-text service
          // For now, we'll show a placeholder message
          this.transcript = '(已录音，请使用语音转文字服务处理)';
          this.isFinal = true;
          onResult(this.transcript, this.isFinal);
          this.isListening = false;
        } catch (error) {
          onError('录音处理失败');
          this.isListening = false;
        }
      }, recordingDuration);

      onResult('正在录音...', false);
    } catch (error) {
      console.error('Native speech recognition error:', error);
      onError('语音识别启动失败');
      this.isListening = false;
    }
  }

  /**
   * Stop listening
   */
  stopListening(): string {
    if (this.isNative) {
      // Native stop is handled in the timer callback
      this.isListening = false;
    } else if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
    return this.transcript.trim();
  }

  /**
   * Abort recognition
   */
  abort(): void {
    if (this.isNative) {
      this.isListening = false;
    } else if (this.recognition) {
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
