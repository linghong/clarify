import { useRef, useCallback, useEffect } from 'react';
import { base64ToFloat32Audio, AUDIO_CONFIG } from '@/lib/audioutils';
import { ChatMessage } from "@/types/chat";

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

export function useAudioStreaming(
  getAudioContext: () => Promise<AudioContext>,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  onAudioPlaybackComplete: (responseId: string) => void
): AudioStreamingHook {
  const bufferRef = useRef<BufferItem[]>([]);
  const isPlayingRef = useRef(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const processingLockRef = useRef<boolean>(false);
  const accumulatedDurationsRef = useRef<Record<string, number>>({});

  const updateMessages = useCallback((content: string, item_id: string) => {
    setMessages(prev => {
      const index = prev.findIndex(message => message.item_id === item_id);
      if (index !== -1) {
        // Update existing message
        const updatedMessages = [...prev];
        updatedMessages[index] = {
          role: 'assistant' as const,
          content: prev[index].content + content,
          item_id
        };
        return updatedMessages;
      } else {
        // Add new message
        return [
          ...prev,
          {
            role: 'assistant' as const,
            content,
            item_id
          }
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
              onAudioPlaybackComplete(doneItem?.responseId || '');
              return;
            }

            if (bufferRef.current[0]?.type === 'transcript' &&
              bufferRef.current[0]?.itemId === playedItem?.itemId) {
              const transcriptItem = bufferRef.current.shift();
              if (transcriptItem && transcriptItem.itemId) {
                updateMessages(transcriptItem.data, transcriptItem.itemId);
              }
            }

            // Continue processing remaining items
            processBuffer();
          };

          sourceRef.current.start(0);
        } catch (error) {
          console.error('Error in processBuffer:', error);
          if (sourceRef.current) {
            sourceRef.current.disconnect();
          }
          isPlayingRef.current = false;
          processingLockRef.current = false;
        }

      } else if (nextItem.type === 'transcript') {
        if (nextItem.itemId) {
          updateMessages(nextItem.data, nextItem.itemId);
        }
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
  }, [getAudioContext, updateMessages, onAudioPlaybackComplete]);

  const cleanupAudioChunk = useCallback(async () => {
    try {
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
        } catch (error) {
          console.error('Error stopping audio source:', error instanceof Error ? error.message : 'Unknown error');
        } finally {
          sourceRef.current = null;
        }
      }

      // Ensure all flags are reset
      isPlayingRef.current = false;
      processingLockRef.current = false;

      // Store IDs before clearing buffer
      const lastItemId = currentItem?.itemId;
      const lastResponseId = currentItem?.responseId;

      bufferRef.current = [];
      accumulatedDurationsRef.current = {};

      // Wait a small delay to ensure audio system is fully reset
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        lastItemId,
        lastResponseId,
        playedDurationMs
      };
    } catch (error) {
      console.error('Error in cleanupAudioChunk:', error instanceof Error ? error.message : 'Unknown error');
      // Ensure cleanup even if there's an error
      sourceRef.current = null;
      isPlayingRef.current = false;
      processingLockRef.current = false;
      bufferRef.current = [];
      accumulatedDurationsRef.current = {};
      return {};
    }
  }, []);

  const playAudioChunk = useCallback(async (base64Audio: string, item_id: string, response_id: string) => {
    try {
      // Don't add new chunks if we're in the middle of cleanup
      if (processingLockRef.current) {
        console.log('Skipping audio chunk during cleanup');
        return;
      }

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

      if (!isPlayingRef.current && !processingLockRef.current) {
        await processBuffer();
      }
    } catch (error) {
      console.error('Error in playAudioChunk:', error);
      // Reset state if there's an error
      await cleanupAudioChunk();
    }
  }, [processBuffer, cleanupAudioChunk]);

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
}