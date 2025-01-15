export interface AudioProcessingResult {
  audio: string;
  sampleRate: number;
}

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