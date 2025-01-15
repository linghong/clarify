import { useRef, useCallback } from 'react';
import { base64EncodeAudio, AUDIO_CONFIG } from '@/lib/audioutils';

interface AudioProcessingResult {
  audio: string;
  sampleRate: number;
}

interface AudioProcessingHook {
  processAudioData: (audioData: Float32Array) => void;
  onAudioProcessed: (callback: (result: AudioProcessingResult) => void) => void;
}

export const useAudioProcessing = (): AudioProcessingHook => {
  const processingBufferRef = useRef<Float32Array>(new Float32Array(0));
  const audioCallbackRef = useRef<((result: AudioProcessingResult) => void) | null>(null);

  const processAudioData = useCallback((audioData: Float32Array) => {
    // Concatenate with existing processing buffer
    const newBuffer = new Float32Array(
      processingBufferRef.current.length + audioData.length
    );
    newBuffer.set(processingBufferRef.current);
    newBuffer.set(audioData, processingBufferRef.current.length);
    processingBufferRef.current = newBuffer;

    // Process in optimal chunks
    while (processingBufferRef.current.length >= AUDIO_CONFIG.RECORDING_CHUNK_SIZE) {
      const chunk = processingBufferRef.current.slice(0, AUDIO_CONFIG.RECORDING_CHUNK_SIZE);
      sendAudioChunk(chunk);
      processingBufferRef.current = processingBufferRef.current.slice(AUDIO_CONFIG.RECORDING_CHUNK_SIZE);
    }
  }, []);

  const sendAudioChunk = useCallback((chunk: Float32Array) => {
    const result: AudioProcessingResult = {
      audio: base64EncodeAudio(chunk),
      sampleRate: AUDIO_CONFIG.SAMPLE_RATE
    };

    if (audioCallbackRef.current) {
      audioCallbackRef.current(result);
    }
  }, []);

  const onAudioProcessed = useCallback((callback: (result: AudioProcessingResult) => void) => {
    audioCallbackRef.current = callback;
  }, []);

  return { processAudioData, onAudioProcessed };
};