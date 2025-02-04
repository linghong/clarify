import { WebSocket } from 'ws';
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
  private userProfile: UserProfile;
  private currentFunctionArgs: string = '';
  private currentPdfFileName: string | null = null;
  private MaxPdfContentLenth: number = 20000;
  private isAISpeaking: boolean = false;
  private isAudioPlaying: boolean = false;
  constructor(ws: CustomWebSocket, openAIWs: CustomWebSocket, userProfile: UserProfile) {
    super(ws);
    this.ws = ws;
    this.openAIWs = openAIWs;
    this.userProfile = userProfile;
    this.visualAgent = new VisualAgent(ws, openAIWs);
    this.researchAgent = new ResearchAgent(ws, openAIWs);
    this.setupWebSocketHandlers();
  }

  private getSessionUpdateEvent() {
    return {
      type: 'session.update',
      session: {
        instructions: `IMPORTANT: You must always communicate in English. Only switch to another language if explicitly requested by the user. You are an empathetic, supportive, and capable AI tutor. Your main goal is to help users understand the content they share with you. When answering user questions, don't just read the answer from the content, but behave as a tutor does: explain concepts step by step, define unfamiliar terms based on your user's background, pause after each key point to ensure clarity, and adjust explanations according to your user's responses.
        
        You are not working alone. You function as a real-time frontline AI voice agent and work seamlessly with your AI colleagues, VisualAgent and ResearchAgent. As the frontline agent, your role is to interact with users and answer their questions. When you are unable to answer a question, avoid saying "No." Instead, delegate tasks or queries to your colleagues. The VisualAgent specializes in handling visual data, so any queries related to screen content, browser content, or articles opened on the user's computer should be directed to the VisualAgent. For queries requiring up-to-date information or internet searches, involve the ResearchAgent. While waiting for responses from your colleagues, inform the user that you are looking into their request. Use this time to gather additional details from the user. Once you receive a response from your colleagues, integrate all the information into your unique teaching style. 
        
        Although your primary role is as an AI tutor, users may ask you non-academic questions. In such cases, respond as a general AI assistant would, rather than adopting a tutor role. If you are unsure about the answer, you may delegate the question to your colleagues for an internet search or visual content assistance.
        
        Remember, you represent the entire team, not just yourself. Therefore, never disclose the existence of your colleagues.
        
        ${this.userProfile ? `
         Basic information about the current user:
         ${this.userProfile.educationLevel ? `The user has ${this.userProfile.educationLevel} level education.` : ''}
         ${this.userProfile.major ? `Their field of study is ${this.userProfile.major}.` : ''}
         ${this.userProfile.description ? `About them: ${this.userProfile.description}` : ''}
         ` : ''}`,
        voice: "alloy",
        modalities: ["text", "audio"],
        tool_choice: "auto",
        "turn_detection": {
          "type": "server_vad",
          "threshold": 0.5,
          "prefix_padding_ms": 300,
          "silence_duration_ms": 600
        },
        "temperature": 0.6,
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
            description: `Call this function whenever a user message mentions visual content such as charts, graphs, tables, or a currently opened browser on the user's computer. Also call this function when answering the question without access to this visual content would risk providing an incorrect response or require you to say, 'I'm unable to answer this question.' The VisualAgent has both text and visual capibility, thus can provide you an accurate answer. 
            
           While waiting for the VisualAgent to respond to your inquiry, inform the user that you need some time to review the content or think about the answer. Alternatively, you can use this time to gather more information from the user, such as their background or prior knowledge about the topic.`,
            parameters: {
              type: 'object',
              properties: {
                user_question: {
                  type: 'string',
                  description: "The user questions you want to get answered based on the user's visual input"
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
            description: `Call this function when the content in a PDF contains concepts you don't know,information not included in your training data, or when answering requires an internet search for current or up-to-date information. Also, call this agent whenever users ask questions that explicitly require current information or an internet search.
            
           While waiting for the ResearchAgent to respond to your inquiry, inform the user that you need some time to research the internet to provide the answer. Alternatively, use this time to gather additional details from the user, such as their background or prior knowledge about the topic.`,
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
                  description: "Briefly explain your aim for the answer and why you need it, so that the ResearchAgent can understand the context of the query and provide a more accurate response."
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
          this.handleAudioMessage(message);
          break;

        case 'visual_query':
          this.visualAgent.handleTextMessage(message.query, message.pdfContent, message.base64ImageSrc, message.chatHistory, message.call_id);
          break;

        case 'conversation_cancelled':
          if (message.lastItemId) {
            this.openAIWs.send(JSON.stringify({
              type: 'conversation.item.truncate',
              event_id: `truncate_${Date.now()}`,
              item_id: message.lastItemId,
              content_index: 0,
              audio_end_ms: message.playedDurationMs || 0
            }));
          }
          break;

        case 'audio_playback_completed':
          this.isAudioPlaying = false;
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

  private async handleAudioMessage(data: any) {
    if (!data.audio || data.audio.length === 0) {
      return;
    }
    if (this.openAIWs.readyState === WebSocket.OPEN) {

      let createConversationEvent;
      if (data.pdfFileName && data.pdfFileName !== this.currentPdfFileName) {
        this.currentPdfFileName = data.pdfFileName;
        const audio = data.audio ? [{
          type: 'input_audio',
          audio: data.audio
        }] : []

        createConversationEvent = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{
              "type": "input_text",
              "text": data.pdfContent.length > this.MaxPdfContentLenth ? `Pdf Content:${data.pdfContent.slice(0, this.MaxPdfContentLenth)}` : data.pdfContent
            }
            ]
          }
        }
      }
      // Append to existing conversation
      const audioEvent = {
        type: "input_audio_buffer.append",
        audio: data.audio
      };
      this.openAIWs.send(JSON.stringify(audioEvent));
    }
  }

  private async handleOpenAIMessage(message: string) {
    try {
      const data = JSON.parse(message.toString());
      switch (data.type) {
        case 'session.created':
          // update session to add function call event
          const sessionUpdateEvent = this.getSessionUpdateEvent();
          this.openAIWs.send(JSON.stringify(sessionUpdateEvent));
          break;

        case 'session.updated':
          break;

        case 'conversation.item.created':
          this.ws.send(JSON.stringify({
            type: 'conversation_created',
            previous_item_id: data.previous_item_id,
            item_id: data.item_id,
            role: data.item.role,
          }));
          break;

        case 'input_audio_buffer.speech_started':
          if (this.isAISpeaking || (!this.isAISpeaking && this.isAudioPlaying)) {
            try {
              // Send cancel request to frontend
              this.ws.send(JSON.stringify({
                type: 'cancel_response',
              }));

              this.isAISpeaking = false;
            } catch (error) {
              console.error('Error during cancellation:', error);
            }
          }

          if (this.isAISpeaking) {
            try {
              if (this.openAIWs.readyState === WebSocket.OPEN) {
                await this.openAIWs.send(JSON.stringify({
                  type: 'response.cancel'
                }));
              }
            } catch (error) {
              console.error('Error during cancellation:', error);
            }
          }
          break;

        case 'input_audio_buffer.speech_stopped':
          this.isAISpeaking = false;
          break;

        case 'input_audio_buffer.committed':
        case 'input_audio_buffer.speech_ended':
          this.isAISpeaking = false;
          break;

        case 'response.created':
          if (data.response.status === 'failed') {
            this.ws.send(JSON.stringify({
              type: 'error',
              error: data.response.status_details?.error || 'response created failed'
            }));
          } else {
            console.log('response.created', data)
          };
          break;

        case 'rate_limits.updated':
        case 'response.output_item.added':
        case 'response.content_part.added':
          break;

        case 'response.audio.delta':
          this.isAISpeaking = true;
          this.isAudioPlaying = true;
          this.ws.send(JSON.stringify({
            type: 'audio_response',
            audio: data.delta,
            format: 'pcm16',
            item_id: data.item_id,
            response_id: data.response_id,
            isEndOfSentence: data.isEndOfSentence || false
          }));
          break;

        case 'response.audio_transcript.delta':
          this.ws.send(JSON.stringify({
            type: 'audio_transcript',
            text: data.delta,
            item_id: data.item_id,
            response_id: data.response_id
          }));

          break;

        //this can come earlier or later dependent on how quick the wisper-1 responses
        case 'conversation.item.input_audio_transcription.completed':
          this.ws.send(JSON.stringify({
            type: 'audio_user_message',
            text: data.transcript
          }));
          break;

        case 'conversation.item.input_audio_transcription.failed':
          this.ws.send(JSON.stringify({
            type: 'error',
            text: data.error?.message || 'AI processing error'
          }));
          break;

        case 'response.audio.done':
          this.isAISpeaking = false;
          this.ws.send(JSON.stringify({
            type: 'audio_done',
            response_id: data.response_id,
            item_id: data.item_id
          }));
          this.isProcessing = false;
          break;

        case 'response.audio_transcript.done':
        case 'response.content_part.done':
        case 'response.output_item.done':
          break;

        case 'response.done':
          if (data.response.status === 'failed') {
            this.ws.send(JSON.stringify({
              type: 'error',
              error: data.response.status_details.error
            }))
          }
          break;

        case 'response.function_call_arguments.delta':
          // Accumulate function call arguments
          if (!this.currentFunctionArgs) {
            this.currentFunctionArgs = '';
          }
          this.currentFunctionArgs += data.delta || '';
          break;

        case 'response.function_call_arguments.done':
          this.handleFunctionCall(data);
          break;

        case 'end_audio_session':
          break;

        case 'response.text.delta':
          // Only send text if not cancelled
          if (!this.isProcessing) return;
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

        case 'error':
          /* if (data.error?.message.includes('Cancellation failed')) {
             console.log('Cancellation failed', data.error?.message)
           } else {*/
          this.ws.send(JSON.stringify({
            type: 'error',
            error: data.error?.message || 'AI processing error'
          }));
          // }
          this.isProcessing = false;
          break;

        default:
          console.log('Unhandled OpenAI message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling OpenAI message:', error);
      this.ws.send(JSON.stringify({
        type: 'error',
        error: error || 'AI processing error'
      }));
    }
  }

  private async handleFunctionCall(data: any) {
    try {
      const args = JSON.parse(this.currentFunctionArgs);
      switch (args.function_name) {
        case 'inquiry_visual_agent':
          await this.visualAgent.handleMessage({
            type: 'capture_screenshot',
            text: args.user_question,
            call_id: data.call_id
          });
          break;

        case 'inquiry_research_agent':
          await this.researchAgent.handleMessage({
            type: 'research',
            question: args.question,
            reasonforquery: args.reasonforquery,
            call_id: data.call_id
          });
          break;

        default:
          console.log('Unhandled function call:', args.function_name);
      }
    } catch (error) {
      console.error('Error parsing function arguments:', error);
    } finally {
      this.currentFunctionArgs = '';
    }
  }

  private handleOpenAIError(error: Error) {
    this.ws.send(JSON.stringify({
      type: 'error',
      error: 'AI connection error'
    }));
    // 1011 = Server Error (Internal Error)
    this.ws.close(1011, 'OpenAI connection failed');
  }

  cleanup() {
    if (this.openAIWs) {
      this.openAIWs.close();
    }
  }
}