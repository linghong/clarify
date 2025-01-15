'use strict';

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 256;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const inputChannel = input[0];

    // Add incoming samples to buffer
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex] = inputChannel[i];
      this.bufferIndex++;

      // When buffer is full, send it to the main thread
      if (this.bufferIndex >= this.bufferSize) {
        this.port.postMessage({
          eventType: 'audio',
          audioData: this.buffer.slice()
        });

        // Reset buffer
        this.bufferIndex = 0;
        this.buffer = new Float32Array(this.bufferSize);
      }
    }

    return true;
  }
}

try {
  registerProcessor('audio-processor', AudioProcessor);
} catch (error) {
  console.error('Failed to register audio processor:', error);
}