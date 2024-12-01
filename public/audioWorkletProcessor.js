class AudioRecorderProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      this.port.postMessage({
        audioData: input[0]
      });
    }
    return true;
  }
}

registerProcessor('audio-recorder', AudioRecorderProcessor); 