import { useRef, useCallback } from 'react';
import { AUDIO_CONFIG } from '@/types/audio';
import { base64EncodeAudio } from '@/lib/audioutils';

export const useAudioProcessing = (wsRef: React.RefObject<WebSocket>) => {
  const audioBufferRef = useRef<Float32Array[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);

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
    if (audioBufferRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      const totalLength = audioBufferRef.current.reduce((acc, curr) => acc + curr.length, 0);
      const concatenatedData = new Float32Array(totalLength);
      let offset = 0;

      audioBufferRef.current.forEach(chunk => {
        concatenatedData.set(chunk, offset);
        offset += chunk.length;
      });

      wsRef.current.send(JSON.stringify({
        type: 'audio',
        audio: base64EncodeAudio(concatenatedData),
        sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
        endOfSpeech: true
      }));

      audioBufferRef.current = [];
    }
  }, [wsRef]);

  return { processAudioData };
};