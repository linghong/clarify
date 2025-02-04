import { useRef, useCallback, useEffect } from 'react';
import { base64ToFloat32Audio, AUDIO_CONFIG } from '@/lib/audioutils';

interface BufferItem {
  type: 'audio' | 'transcript';
  data: string;
  timestamp: number;
  audioDuration?: number
  itemId?: string;
  responseId?: string;
}

interface AudioStreamingHook {
  playAudioChunk: (base64Audio: string, item_id: string, response_id: string) => Promise<void>;
  addTranscriptChunk: (text: string, item_id: string, response_id: string) => void;
  addAudioDoneMessage: (item_id: string, response_id: string) => void;
  cleanupAudioChunk: () => Promise<{
    lastItemId?: string;
    lastResponseId?: string;
    playedDurationMs?: number;
  }>;
}

export const useAudioStreaming = (
  getAudioContext: () => Promise<AudioContext>,
  setMessages: (updater: (prev: any[]) => any[]) => void,
  onAudioComplete?: (responseId?: string) => void
): AudioStreamingHook => {
  const bufferRef = useRef<BufferItem[]>([]);
  const isPlayingRef = useRef(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const processingLockRef = useRef<boolean>(false);
  const accumulatedDurationsRef = useRef<Record<string, number>>({});

  const updateMessages = useCallback((content: string) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === 'assistant') {
        const newData = [
          ...prev.slice(0, -1),
          { role: 'assistant', content: lastMessage.content + content }
        ]
        return newData;
      } else {
        return [
          ...prev,
          { role: 'assistant', content: content }
        ];
      }
    });
  }, [setMessages]);

  const processBuffer = useCallback(async () => {
    if (processingLockRef.current || isPlayingRef.current) {
      return;
    }

    try {
      processingLockRef.current = true;

      const nextItem = bufferRef.current[0];
      if (!nextItem) {
        processingLockRef.current = false;
        return;
      }

      if (nextItem.type === 'audio') {

        if (nextItem.data === 'done') {
          processingLockRef.current = false;
          return;
        }

        try {
          isPlayingRef.current = true;
          const audioContext = await getAudioContext();
          processingLockRef.current = false;

          const samples = base64ToFloat32Audio(nextItem.data);
          if (!samples?.length) {
            throw new Error('Invalid audio data');
          }

          const audioBuffer = audioContext.createBuffer(
            1,
            samples.length,
            AUDIO_CONFIG.SAMPLE_RATE
          );
          audioBuffer.getChannelData(0).set(samples);

          const durationMs = Math.floor(
            (samples.length / AUDIO_CONFIG.SAMPLE_RATE) * 1000
          );

          nextItem.audioDuration = durationMs;

          sourceRef.current = audioContext.createBufferSource();
          sourceRef.current.buffer = audioBuffer;
          sourceRef.current.connect(audioContext.destination);

          sourceRef.current.onended = () => {
            isPlayingRef.current = false;

            const playedItem = bufferRef.current.shift();

            // Check if next item is 'done' signal
            if (bufferRef.current[0]?.data === 'done') {
              const doneItem = bufferRef.current.shift();
              onAudioComplete?.(doneItem?.responseId);
              return;
            }

            if (bufferRef.current[0]?.type === 'transcript' &&
              bufferRef.current[0]?.itemId === playedItem?.itemId) {
              const transcriptItem = bufferRef.current.shift();
              if (transcriptItem) {
                updateMessages(transcriptItem.data);
              }
            }

            // Continue processing remaining items
            processBuffer();
          };

          sourceRef.current.start(0);
        } catch (error) {
          if (sourceRef.current) {
            sourceRef.current.disconnect();
          }
          isPlayingRef.current = false;
          processingLockRef.current = false;
        }

      } else if (nextItem.type === 'transcript') {
        updateMessages(nextItem.data);
        bufferRef.current.shift();
        processingLockRef.current = false;
        processBuffer();
      }

    } catch (error) {
      console.error('Buffer processing error:', error);
      bufferRef.current = [];
      isPlayingRef.current = false;
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      processingLockRef.current = false;
    }
  }, [getAudioContext, updateMessages, onAudioComplete]);

  const playAudioChunk = useCallback(async (base64Audio: string, item_id: string, response_id: string) => {
    const samples = base64ToFloat32Audio(base64Audio);
    const durationMs = Math.floor((samples.length / AUDIO_CONFIG.SAMPLE_RATE) * 1000);

    // Accumulate duration for this response
    if (response_id) {
      accumulatedDurationsRef.current[response_id] =
        (accumulatedDurationsRef.current[response_id] || 0) + durationMs;
    }

    bufferRef.current.push({
      type: 'audio',
      data: base64Audio,
      timestamp: Date.now(),
      itemId: item_id ?? undefined,
      responseId: response_id ?? undefined,
      audioDuration: durationMs
    });

    if (!isPlayingRef.current) {
      processBuffer();
    }
  }, [processBuffer, getAudioContext]);

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

  const addAudioDoneMessage = useCallback((item_id: string, response_id: string) => {
    bufferRef.current.push({
      type: 'audio',
      data: 'done',
      timestamp: Date.now(),
      itemId: item_id,
      responseId: response_id
    });
    if (!isPlayingRef.current) {
      processBuffer();
    }
  }, [processBuffer]);

  const cleanupAudioChunk = useCallback(async () => {
    const currentItem = bufferRef.current[0];

    // Only include responseId if we're currently playing audio
    const responseId = isPlayingRef.current ? currentItem?.responseId : undefined;

    // Calculate played duration for the current response
    let playedDurationMs = 0;
    if (responseId && accumulatedDurationsRef.current[responseId]) {
      playedDurationMs = accumulatedDurationsRef.current[responseId];
    } else if (currentItem?.audioDuration) {
      playedDurationMs = currentItem.audioDuration;
    }

    // Stop current playback if any
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
        sourceRef.current = null;
      } catch (error) {
        console.error('Error stopping audio source:', error);
      }
    }

    isPlayingRef.current = false;
    processingLockRef.current = false;

    // Store IDs before clearing buffer
    const lastItemId = currentItem?.itemId;
    const lastResponseId = currentItem?.responseId;

    bufferRef.current = [];
    accumulatedDurationsRef.current = {};

    return {
      lastItemId,
      lastResponseId,
      playedDurationMs
    };
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      }
      bufferRef.current = [];
      accumulatedDurationsRef.current = {};
    };
  }, []);

  return { playAudioChunk, addTranscriptChunk, addAudioDoneMessage, cleanupAudioChunk };
};