import { useRef, useCallback } from 'react';
import { AUDIO_CONFIG } from '@/types/audio';
import { base64EncodeAudio } from '@/lib/audioutils';

interface AudioProcessingResult {
  audio: string;
  sampleRate: number;
  endOfSpeech: boolean;
}

interface AudioProcessingHook {
  processAudioData: (audioData: Float32Array) => void;
  onAudioProcessed: (callback: (result: AudioProcessingResult) => void) => void;
}

export const useAudioProcessing = (): AudioProcessingHook => {
  const audioBufferRef = useRef<Float32Array[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);
  const audioCallbackRef = useRef<((result: AudioProcessingResult) => void) | null>(null);

  const processAudioData = useCallback((audioData: Float32Array) => {
    const rms = Math.sqrt(audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length);
    const db = 20 * Math.log10(rms);
    const isSpeaking = db > AUDIO_CONFIG.SILENCE_THRESHOLD;

    if (isSpeaking && !isSpeakingRef.current) {
      handleSpeechStart();
    } else if (!isSpeaking && isSpeakingRef.current) {
      handlePotentialSpeechEnd();
    }

    audioBufferRef.current.push(audioData);
  }, []);

  const handleSpeechStart = useCallback(() => {
    isSpeakingRef.current = true;
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  const handlePotentialSpeechEnd = useCallback(() => {
    if (!silenceTimeoutRef.current) {
      silenceTimeoutRef.current = setTimeout(() => {
        sendAccumulatedBuffer();
        isSpeakingRef.current = false;
      }, AUDIO_CONFIG.SILENCE_DURATION);
    }
  }, []);

  const sendAccumulatedBuffer = useCallback(() => {
    if (audioBufferRef.current.length > 0 && audioCallbackRef.current) {
      const totalLength = audioBufferRef.current.reduce((acc, curr) => acc + curr.length, 0);
      const concatenatedData = new Float32Array(totalLength);
      let offset = 0;

      audioBufferRef.current.forEach(chunk => {
        concatenatedData.set(chunk, offset);
        offset += chunk.length;
      });

      const result: AudioProcessingResult = {
        audio: base64EncodeAudio(concatenatedData),
        sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
        endOfSpeech: true
      };

      audioCallbackRef.current(result);
      audioBufferRef.current = [];
    }
  }, []);

  const onAudioProcessed = useCallback((callback: (result: AudioProcessingResult) => void) => {
    audioCallbackRef.current = callback;
  }, []);

  return { processAudioData, onAudioProcessed };
};