import { useRef, useCallback } from 'react';
import { AUDIO_CONFIG } from '@/types/audio';
import { base64EncodeAudio } from '@/lib/audioutils';

interface AudioProcessingResult {
  audio: string;
  sampleRate: number;
}

interface AudioProcessingHook {
  processAudioData: (audioData: Float32Array) => void;
  onAudioProcessed: (callback: (result: AudioProcessingResult) => void) => void;
}

// Smaller chunk size for more frequent updates (about 20ms of audio at 24kHz)
const CHUNK_SIZE = 960;

export const useAudioProcessing = (): AudioProcessingHook => {
  const audioBufferRef = useRef<Float32Array[]>([]);
  const audioCallbackRef = useRef<((result: AudioProcessingResult) => void) | null>(null);

  const processAudioData = useCallback((audioData: Float32Array) => {
    audioBufferRef.current.push(audioData);

    // Send data more frequently based on accumulated samples
    const totalSamples = audioBufferRef.current.reduce((acc, curr) => acc + curr.length, 0);

    if (totalSamples >= CHUNK_SIZE) {
      sendAccumulatedBuffer();
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
        sampleRate: AUDIO_CONFIG.SAMPLE_RATE
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