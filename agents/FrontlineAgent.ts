import WebSocket from 'ws';
import { WebSocket as WSType } from 'ws';
import { BaseAgent } from './BaseAgent';
import { MessageBroker } from '../server/services/MessageBroker';

// Define a custom WebSocket type that matches ws library's WebSocket type
interface CustomWebSocket extends WSType {
  dispatchEvent: (event: Event) => boolean;
}

export class FrontlineAgent extends BaseAgent {
  protected ws: CustomWebSocket;
  private openAIWs: CustomWebSocket;
  private messageBroker: MessageBroker;
  protected isProcessing: boolean = false;

  constructor(ws: CustomWebSocket, openAIWs: CustomWebSocket, messageBroker: MessageBroker) {
    super(ws);
    this.ws = ws;
    this.openAIWs = openAIWs;
    this.messageBroker = messageBroker;
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    this.openAIWs.on('message', this.handleOpenAIMessage.bind(this));
    this.openAIWs.on('error', this.handleOpenAIError.bind(this));
  }

  async handleMessage(message: any): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      switch (message.type) {
        case 'text':
          await this.handleTextMessage(message);
          break;
        case 'audio':
          await this.handleAudioMessage(message);
          break;
        case 'complex_query':
          // Route to ExpertAgent for complex queries
          await this.messageBroker.publish('expert.query', message);
          break;
        default:
          console.log('Unhandled message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      this.ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process message'
      }));
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleTextMessage(data: any) {
    if (this.openAIWs.readyState === WebSocket.OPEN) {
      const createConversationEvent = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{
            type: "input_text",
            text: data.text
          }]
        }
      };
      this.openAIWs.send(JSON.stringify(createConversationEvent));

      const createResponseEvent = {
        type: "response.create",
        response: {
          modalities: ['text', 'audio'],
          instructions: "Respond naturally and conversationally.",
        },
      };
      this.openAIWs.send(JSON.stringify(createResponseEvent));
    }
  }

  private async handleAudioMessage(data: any) {
    if (!data.audio || data.audio.length === 0) {
      console.log("Received empty audio - ending session");
      if (this.openAIWs.readyState === WebSocket.OPEN) {
        const endSessionEvent = {
          type: "session.end"
        };
        this.openAIWs.send(JSON.stringify(endSessionEvent));
      }
    } else {
      console.log("Received audio chunk, length:", data.audio.length);
      if (this.openAIWs.readyState === WebSocket.OPEN) {
        const createConversationEvent = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{
              type: 'input_audio',
              audio: data.audio
            }]
          }
        };
        this.openAIWs.send(JSON.stringify(createConversationEvent));

        const createResponseEvent = {
          type: "response.create",
          response: {
            modalities: ['text', 'audio'],
            instructions: "Respond naturally and conversationally.",
          },
        };
        this.openAIWs.send(JSON.stringify(createResponseEvent));
      }
    }
  }

  private handleOpenAIMessage(message: string) {
    try {
      const data = JSON.parse(message.toString());
      switch (data.type) {
        case 'response.text.delta':
          this.ws.send(JSON.stringify({
            type: 'text',
            text: data.delta,
            isEndOfSentence: /[.!?](\s|$)/.test(data.delta)
          }));
          break;
        case 'response.text.done':
          this.ws.send(JSON.stringify({
            type: 'text_done',
            text: data.text
          }));
          this.isProcessing = false;
          break;
        case 'response.audio.delta':
          this.ws.send(JSON.stringify({
            type: 'audio_response',
            audio: data.delta,
            format: 'pcm16',
            isEndOfSentence: data.isEndOfSentence || false
          }));
          break;
        case 'response.audio.done':
          this.ws.send(JSON.stringify({
            type: 'audio_done'
          }));
          this.isProcessing = false;
          break;
        case 'error':
          console.error('OpenAI error:', data);
          this.ws.send(JSON.stringify({
            type: 'error',
            error: data.error?.message || 'AI processing error'
          }));
          this.isProcessing = false;
          break;
        case 'response.audio_transcript.delta':
          console.log('transcript', data.delta);
          this.ws.send(JSON.stringify({
            type: 'transcript',
            text: data.delta
          }));
          break;
        case 'response.audio_transcript.done':
          // Send complete transcript
          this.ws.send(JSON.stringify({
            type: 'transcript_done',
            text: data.transcript
          }));
          break;
        default:
          console.log('Unhandled message type:', data.type, data);
      }
    } catch (error) {
      console.error('Error handling OpenAI message:', error);
    }
  }

  private handleOpenAIError(error: Error) {
    console.error('OpenAI WebSocket error:', error);
    this.ws.send(JSON.stringify({
      type: 'error',
      error: 'AI connection error'
    }));
    this.ws.close(1011, 'OpenAI connection failed');
  }

  cleanup() {
    if (this.openAIWs) {
      this.openAIWs.close();
    }
  }
}