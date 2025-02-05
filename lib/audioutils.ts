export function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export function base64EncodeAudio(float32Array: Float32Array): string {
  const arrayBuffer = floatTo16BitPCM(float32Array);
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000; // 32KB chunk size
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error('Error converting base64 to Uint8Array:', error);
    throw new Error('Invalid base64 string');
  }
}

export function base64ToFloat32Audio(base64Audio: string): Float32Array {
  if (!base64Audio) {
    throw new Error('Empty audio data');
  }

  const bytes = base64ToUint8Array(base64Audio);
  if (bytes.length % 2 !== 0) {
    throw new Error('Invalid audio data length');
  }

  const samples = new Float32Array(bytes.length / 2);
  const dataView = new DataView(bytes.buffer);

  try {
    for (let i = 0; i < samples.length; i++) {
      samples[i] = dataView.getInt16(i * 2, true) / 32768.0;
    }
    return samples;
  } catch (error) {
    throw new Error('Failed to convert audio data: ' + (error as Error).message);
  }
}

export const AUDIO_CONFIG = {
  AUDIO_WORKLET_PATH: '/audioWorkletProcessor.js',
  SAMPLE_RATE: 24000, // match OpenAI's required sample rate
  RECORDING_CHUNK_SIZE: 2048,
  PLAYBACK_BUFFER_SIZE: 512,
  LATENCY_HINT: 'interactive' as AudioContextLatencyCategory,
  AUDIO_CONSTRAINTS: { // These are MediaTrackConstraints
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1     // Mono audio
  }
};