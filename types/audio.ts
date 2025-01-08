export const AUDIO_CONFIG = {
  SILENCE_THRESHOLD: -50,// dB threshold for silence detection
  SILENCE_DURATION: 2000,// Wait 2 seconds of silence before considering speech ended
  SAMPLE_RATE: 24000,// OpenAI's required sample rate
  BUFFER_INTERVAL: 500,// Buffer for 500ms before sending
  AUDIO_WORKLET_PATH: '/audioWorkletProcessor.js',
  AUDIO_CONSTRAINTS: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 24000,  // Match OpenAI's sample rate
    channelCount: 1     // Mono audio
  }
} as const;

// Audio message types
export interface AudioMessage {
  type: 'audio';
  audio: string;
  sampleRate: number;
  endOfSpeech?: boolean;
}

// OpenAI response types
export interface OpenAIResponse {
  type: string;
  delta?: any;
  transcript?: string;
  error?: {
    message: string;
    [key: string]: any;
  };
  [key: string]: any;
}