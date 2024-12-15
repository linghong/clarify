import { WebSocket as WSType } from 'ws';
import { BaseAgent } from './BaseAgent';
import { CustomWebSocket } from '../types/websocket';
import { VisualAgent } from './VisualAgent';
import { ResearchAgent } from './ResearchAgent';
import { UserProfile } from '@/lib/getUserProfile';

export class FrontlineAgent extends BaseAgent {
  protected ws: CustomWebSocket;
  private openAIWs: CustomWebSocket;
  protected isProcessing: boolean = false;
  private visualAgent: VisualAgent;
  private researchAgent: ResearchAgent;
  private activeSession: boolean = false;
  private userProfile: UserProfile;
  private isAISpeaking: boolean = false;
  private audioBuffer: any = null;

  constructor(ws: CustomWebSocket, openAIWs: CustomWebSocket, userProfile: UserProfile) {
    super(ws);
    this.ws = ws;
    this.openAIWs = openAIWs;
    this.userProfile = userProfile;
    this.visualAgent = new VisualAgent(ws, openAIWs);
    this.researchAgent = new ResearchAgent(ws, openAIWs);
    this.setupWebSocketHandlers();
  }

  private get sessionUpdateEvent() {
    return {
      type: 'session.update',
      session: {
        instructions: `
         You are a helpful real-time voice AI assistant, fluent in English. Your primary goal is to help users understand the content they share with you. You collaborate seamlessly with two AI colleagues, VisualAgent and ResearchAgent, functioning as a cohesive team.

        As the frontline agent, your role is to interact directly with users, behaves as a teacher, answer their questions, and delegate tasks to your colleagues when necessary. If you cannot answer a question:

        - Direct visual queries (e.g., screen content or documents) to VisualAgent.
        - Delegate requests for real-time or current information to ResearchAgent.

        For complex or lengthy topics:

        - Explain concepts step by step.
        - Confirm the user’s understanding after each step before proceeding.
        - Avoid delivering information in long paragraphs; focus on clarity and engagement.

        While waiting for responses from your colleagues:

        - Inform the user you are working on their request.
        - Use this time to ask clarifying questions to better understand their needs.
        - Once the responses arrive, synthesize all the information into a clear and comprehensive answer.

        Key Guidelines:

        - Represent the team as a unified entity. Never disclose that you have colleagues.

        ${this.userProfile ? `
         **User Information**:
         ${this.userProfile.educationLevel ? `-Education Level: ${this.userProfile.educationLevel}` : ''}
         ${this.userProfile.major ? `- Field of study: ${this.userProfile.major}.` : ''}
         ${this.userProfile.description ? `Additional Notes: ${this.userProfile.description}` : ''}
         ` : ''}
`,
        voice: "alloy",
        modalities: ["text", "audio"],
        tool_choice: "auto",
        "turn_detection": {
          "type": "server_vad",
          "threshold": 0.6,
          "silence_duration_ms": 1000
        },
        "temperature": 1,
        "max_response_output_tokens": 4096,
        "input_audio_format": "pcm16",
        "output_audio_format": "pcm16",
        "input_audio_transcription": {
          "model": "whisper-1"
        },
        tools: [
          {
            name: 'inquiry_visual_agent',
            type: 'function',
            description: `Call this function whenever a user message mentions visual content such as charts, graphs, tables, or a currently opened browser on the user’s computer. Use it when answering the question without access to this visual content would risk providing an incorrect response or require you to say, 'I’m unable to answer this question.'

            The VisualAgent has both text and visual capabilities, enabling it to provide accurate answers in such scenarios.
            
            While waiting for the VisualAgent to respond to your inquiry, inform the user that you need some time to review the content or think about the answer. Alternatively, you can use this time to gather more information from the user, such as their background or prior knowledge about the topic.` ,
            parameters: {
              type: 'object',
              properties: {
                user_question: {
                  type: 'string',
                  description: "The user's questions that require answers based on their visual input."
                },
                function_name: {
                  type: 'string',
                  description: "The name of the function you want to call, i.e. inquiry_visual_agent"
                }
              },
              required: ["user_question", "function_name"],
            }
          },
          {
            name: 'inquiry_research_agent',
            type: 'function',
            description: `Call this function when the content in a PDF contains concepts you don’t know,information not included in your training data, or when answering requires an internet search for current or up-to-date information. Also, call this agent whenever users ask questions that explicitly require current information or an internet search.

            While waiting for the ResearchAgent to respond to your inquiry, inform the user that you need some time to research the internet to provide the answer. Alternatively, use this time to gather additional details from the user, such as their background or prior knowledge about the topic.
          `,
            parameters: {
              type: 'object',
              properties: {
                question: {
                  type: 'string',
                  description: "The questions you want the ResearchAgent to answer"
                },
                function_name: {
                  type: 'string',
                  description: "The name of the function you want to call, i.e. inquiry_research_agent"
                },
                reasonforquery: {
                  type: 'string',
                  description: "Briefly explain your aim for the answer and why you need it, so the ResearchAgent can understand the query's context and provide a more accurate response."
                }
              },
              required: ["question", "function_name", "reasonforquery"],
            }
          }
        ]
      }
    };
  }

  private setupWebSocketHandlers() {
    this.openAIWs.on('message', this.handleOpenAIMessage.bind(this));
    this.openAIWs.on('error', this.handleOpenAIError.bind(this));
  }

  // handle message from frontend
  async handleMessage(message: any): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      switch (message.type) {
        case 'audio':
          await this.handleAudioMessage(message);
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

  private async handleAudioMessage(message: any) {
    if (this.isAISpeaking || !message.audio || message.audio.length === 0) {
      return;
    }

    // Convert audio data to proper format if needed
    const audioData = message.audio instanceof Float32Array
      ? Buffer.from(message.audio.buffer)  // Convert Float32Array to Buffer
      : message.audio;

    if (this.openAIWs.readyState === WSType.OPEN) {
      if (!this.activeSession) {
        const createConversationEvent = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{
              type: 'input_audio',
              audio: audioData  // Send raw audio bytes
            }]
          }
        };
        this.openAIWs.send(JSON.stringify(createConversationEvent));
        this.activeSession = true;
      } else {
        // Send audio buffer append event
        const audioEvent = {
          type: "input_audio_buffer.append",
          audio: audioData  // Send raw audio bytes
        };
        this.openAIWs.send(JSON.stringify(audioEvent));
      }
    }
  }

  private async handleOpenAIMessage(message: string) {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'session.updated':
          console.log('Session settings updated');
          break;

        case 'input_audio_buffer.speech_stopped':
          // User stopped speaking, but don't commit yet
          break;

        case 'input_audio_buffer.speech_started':
          this.ws.send(JSON.stringify({
            type: 'input_audio_buffer.clear',
          }));
          break;

        case 'input_audio_buffer.committed':
          // Audio buffer was successfully committed
          console.log('Audio buffer committed');
          break;

        case 'input_audio_buffer.speech_ended':
          // Only commit if we have enough audio data
          if (this.audioBuffer && this.audioBuffer.length >= 3200) { // 100ms at 32kHz
            const commitInputEvent = {
              type: "input_audio_buffer.commit"
            };
            this.openAIWs.send(JSON.stringify(commitInputEvent));
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // Transcription is complete
          console.log('Audio transcription completed');
          break;

        case 'response.content_part.done':
        case 'response.output_item.done':
          // These are progress indicators, no special handling needed
          break;

        case 'error':
          console.error('OpenAI error:', data);
          if (data.error?.message.includes('buffer too small')) {
            // Ignore buffer size errors - we'll wait for more audio
            return;
          }
          // Handle other errors...
          break;

        case 'response.done':
          this.isAISpeaking = false;
          this.isProcessing = false;
          this.activeSession = false;
          this.audioBuffer = null; // Reset audio buffer
          this.ws.send(JSON.stringify({
            type: 'ai_turn_complete'
          }));
          break;

        case 'session.created':
          // update session to add function call event
          if (this.sessionUpdateEvent) this.openAIWs.send(JSON.stringify(this.sessionUpdateEvent));
          break;

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
          this.isAISpeaking = true;
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
          break;

        case 'response.audio_transcript.delta':
          this.ws.send(JSON.stringify({
            type: 'audio_transcript',
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

        case 'response.function_call_arguments.done':
          // Parse the arguments string into an object
          const args = typeof data.arguments === 'string'
            ? JSON.parse(data.arguments)
            : data.arguments;

          switch (args.function_name) {
            case 'inquiry_visual_agent':
              this.visualAgent.handleMessage({
                type: 'capture_screenshot',
                text: args.user_question,
                call_id: data.call_id
              });
              break;

            case 'inquiry_research_agent':
              this.researchAgent.handleMessage({
                type: 'research',
                question: args.question,
                reasonforquery: args.reasonforquery,
                call_id: data.call_id
              });
              break;

            default:
              console.log('Unhandled function call:', args.function_name);
          }
          break;

        case 'conversation.item.created':
          // A new conversation item was created
          console.log('New conversation item created');
          break;

        case 'response.created':
        case 'response.output_item.added':
        case 'response.content_part.added':
          // Don't set isAISpeaking here, only on audio.delta
          break;

        case 'rate_limits.updated':
          // Rate limit information received - can be logged if needed
          console.log('Rate limits updated:', data);
          break;

        default:
          console.log('Unhandled OpenAI message type:', data.type);
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

  dispatchEvent(event: Event): boolean {
    // Implement your logic or return a default value
    return true;
  }

  // Add cleanup for the session when stopping recording
  public endAudioSession() {
    if (this.activeSession) {
      const endSessionEvent = {
        type: "session.end"
      };
      this.openAIWs.send(JSON.stringify(endSessionEvent));
      this.activeSession = false;
    }
  }
}