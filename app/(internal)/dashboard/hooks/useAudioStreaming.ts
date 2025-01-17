import { useRef, useCallback } from 'react';
import { base64ToFloat32Audio, AUDIO_CONFIG } from '@/lib/audioutils';

interface AudioStreamingHook {
  playAudioChunk: (base64Audio: string, audioContext: AudioContext) => Promise<void>;
  cleanup: () => Promise<void>;
}

export const useAudioStreaming = (): AudioStreamingHook => {
  const audioQueueRef = useRef<{ buffer: AudioBuffer }[]>([]);
  const isPlayingRef = useRef(false);
  const totalSamplesRef = useRef(0);

  const playAudioChunk = useCallback(async (base64Audio: string, audioContext: AudioContext) => {
    try {

      const samples = base64ToFloat32Audio(base64Audio);
      const audioBuffer = audioContext.createBuffer(1, samples.length, AUDIO_CONFIG.SAMPLE_RATE);
      audioBuffer.getChannelData(0).set(samples);

      audioQueueRef.current.push({ buffer: audioBuffer });
      totalSamplesRef.current += samples.length;

      if (!isPlayingRef.current && totalSamplesRef.current >= AUDIO_CONFIG.PLAYBACK_BUFFER_SIZE) {
        await playNextInQueue(audioContext);
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      await cleanup();
    }
  }, []);

  const playNextInQueue = useCallback(async (audioContext: AudioContext) => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current) return;

    try {
      isPlayingRef.current = true;
      const nextAudio = audioQueueRef.current[0];

      const source = audioContext.createBufferSource();
      source.buffer = nextAudio.buffer;
      source.playbackRate.value = 1.1;
      source.connect(audioContext.destination);

      source.onended = () => {
        audioQueueRef.current.shift();
        totalSamplesRef.current -= nextAudio.buffer.length;
        isPlayingRef.current = false;
        if (audioQueueRef.current.length > 0) {
          playNextInQueue(audioContext);
        }
      };

      source.start(0);
    } catch (error) {
      console.error('Error in playNextInQueue:', error);
      await cleanup();
    }
  }, []);

  const cleanup = useCallback(async () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    totalSamplesRef.current = 0;
  }, []);

  return { playAudioChunk, cleanup };
};