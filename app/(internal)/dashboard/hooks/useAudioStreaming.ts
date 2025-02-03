import { useRef, useCallback } from 'react';
import { base64ToFloat32Audio, AUDIO_CONFIG } from '@/lib/audioutils';

type BufferItem = {
  type: 'audio' | 'transcript';
  data: string;
  timestamp: number;
  audioDuration?: number;
  itemId?: string;
  responseId?: string;
};

interface AudioStreamingHook {
  playAudioChunk: (base64Audio: string, item_id: string, response_id: string) => Promise<void>;
  addTranscriptChunk: (text: string, item_id: string, response_id: string) => void;
  cleanupAudioChunk: (playedDurationMs?: number) => Promise<{
    lastItemId?: string;
    lastResponseId?: string;
    playedDurationMs?: number;
  }>;
}

export const useAudioStreaming = (
  getAudioContext: () => Promise<AudioContext>,
  setMessages: (updater: (prev: any[]) => any[]) => void
): AudioStreamingHook => {
  const bufferRef = useRef<BufferItem[]>([]);
  const isPlayingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const updateMessages = useCallback((content: string) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === 'assistant') {
        return [
          ...prev.slice(0, -1),
          { role: 'assistant', content: lastMessage.content + content }
        ];
      } else {
        return [
          ...prev,
          { role: 'assistant', content: content }
        ];
      }
    });
  }, [setMessages]);

  const processBuffer = useCallback(async () => {
    if (isPlayingRef.current || bufferRef.current.length === 0) return;

    const nextItem = bufferRef.current[0];
    if (!nextItem) return;
    try {
      if (nextItem.type === 'audio') {
        isPlayingRef.current = true;

        const audioContext = await getAudioContext();

        // Convert and play audio
        const samples = base64ToFloat32Audio(nextItem.data);
        if (!samples?.length) throw new Error('Invalid audio data');

        const audioBuffer = audioContext.createBuffer(
          1,
          samples.length,
          AUDIO_CONFIG.SAMPLE_RATE
        );
        audioBuffer.getChannelData(0).set(samples);

        const durationMs = Math.floor(
          (samples.length / AUDIO_CONFIG.SAMPLE_RATE) * 1000
        );

        sourceRef.current = audioContext.createBufferSource();
        sourceRef.current.buffer = audioBuffer;
        sourceRef.current.connect(audioContext.destination);

        // Store duration in buffer item for truncation calculations
        nextItem.audioDuration = durationMs;
        sourceRef.current.start(0);

        sourceRef.current.onended = () => {
          isPlayingRef.current = false;
          const playedItem = bufferRef.current.shift();
          if (bufferRef.current[0]?.type === 'transcript' &&
            bufferRef.current[0]?.itemId === playedItem?.itemId) {
            const transcriptItem = bufferRef.current.shift();
            if (transcriptItem) {
              updateMessages(transcriptItem.data);
            }
          }
          processBuffer();
        };

      } else if (nextItem.type === 'transcript') {
        updateMessages(nextItem.data);
        bufferRef.current.shift();
        processBuffer();
      }
    } catch (error) {
      console.error('Buffer processing error:', error);
      bufferRef.current = [];
      isPlayingRef.current = false;
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
    }
  }, [getAudioContext, setMessages, updateMessages]);

  const playAudioChunk = useCallback(async (base64Audio: string, item_id: string, response_id: string) => {
    // Get shared audio context
    const audioContext = await getAudioContext();
    bufferRef.current.push({
      type: 'audio',
      data: base64Audio,
      timestamp: Date.now(),
      itemId: item_id ?? undefined,
      responseId: response_id ?? undefined
    });
    if (!isPlayingRef.current) {
      processBuffer();
    }
  }, [processBuffer]);

  const addTranscriptChunk = useCallback((text: string, item_id: string, response_id: string) => {
    bufferRef.current.push({
      type: 'transcript',
      data: text,
      timestamp: Date.now(),
      itemId: item_id ?? undefined,
      responseId: response_id ?? undefined
    });
    processBuffer();
  }, [processBuffer]);

  const cleanupAudioChunk = useCallback(async (playedDurationMs?: number) => {
    bufferRef.current = [];
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
    }
    isPlayingRef.current = false;
    // Return metadata for truncation
    return {
      lastItemId: bufferRef.current[0]?.itemId,
      lastResponseId: bufferRef.current[0]?.responseId,
      playedDurationMs
    };
  }, []);

  return { playAudioChunk, addTranscriptChunk, cleanupAudioChunk };
};