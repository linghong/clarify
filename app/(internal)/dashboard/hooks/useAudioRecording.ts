import { useRef, useCallback } from 'react';
import { AUDIO_CONFIG, base64EncodeAudio } from '@/lib/audioutils';

interface AudioProcessingResult {
  audio: string;
  sampleRate: number;
}

interface AudioRecordingHook {
  startRecording: (audioContext: AudioContext, onAudioData: (result: { audio: string, sampleRate: number }) => void) => Promise<void>;
  stopRecording: () => Promise<void>;
}

export const useAudioRecording = (): AudioRecordingHook => {
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processingBufferRef = useRef<Float32Array>(new Float32Array(0));

  const processAudioData = useCallback((audioData: Float32Array) => {
    // Concatenate with existing processing buffer
    const newBuffer = new Float32Array(
      processingBufferRef.current.length + audioData.length
    );
    newBuffer.set(processingBufferRef.current);
    newBuffer.set(audioData, processingBufferRef.current.length);
    processingBufferRef.current = newBuffer;

    let result: AudioProcessingResult | null = null;
    // Process in optimal chunks
    while (processingBufferRef.current.length >= AUDIO_CONFIG.RECORDING_CHUNK_SIZE) {
      const chunk = processingBufferRef.current.slice(0, AUDIO_CONFIG.RECORDING_CHUNK_SIZE);
      result = {
        audio: base64EncodeAudio(chunk),
        sampleRate: AUDIO_CONFIG.SAMPLE_RATE
      };
      processingBufferRef.current = processingBufferRef.current.slice(AUDIO_CONFIG.RECORDING_CHUNK_SIZE);
    }
    return result;
  }, []);

  const startRecording = useCallback(async (audioContext: AudioContext, onAudioData: (result: {
    audio: string, sampleRate: number
  }) => void) => {
    try {
      await audioContext.audioWorklet.addModule(AUDIO_CONFIG.AUDIO_WORKLET_PATH);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
      workletNodeRef.current = workletNode;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONFIG.AUDIO_CONSTRAINTS
      });
      streamRef.current = stream;

      const source = audioContext.createMediaStreamSource(stream);

      workletNode.port.onmessage = async (event) => {
        if (event.data.eventType === 'audio') {
          const result = processAudioData(event.data.audioData);
          if (result) {
            onAudioData(result);
          }
        }
      };

      source.connect(workletNode);
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }, [processAudioData]);

  const stopRecording = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
  }, []);

  return { startRecording, stopRecording };
};