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
  private currentFunctionArgs: string = '';

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
         You are a helpful real-time voice AI assistant. Your main goal is to help users understand the content they share with you. You work seamlessly with your AI colleagues, ExpertAgent and ResearchAgent, as a team. As the frontline agent, your role is to interact with users, answer their questions. When you are unable to answer the questions, don't say "No", instead, yoou should delegate tasks or queries to your colleagues. The ExpertAgent handles visual data, so any queries about screen or browser contents or articles they opened in their computer should also be directed to the ExpertAgent. For queries needing current information or internet searches, involve the ResearchAgent. Always identify when a user's question requires real-time or up-to-date information, and promptly use the ResearchAgent in such cases. While waiting for responses from your colleagues, inform users that you are looking into their request. Use this time to gather more details from the user. Once you receive your colleague's response, combine all information into a comprehensive answer. Remember, you represent the whole team, not just yourself, so never disclose that you have colleagues. 
         ${this.userProfile ? `
         Basic information about the user:
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
            description: `Call this function whenever a user message mentions visual content such as charts, graphs, tables, or a currently opened browser on the user’s computer. Also call this function when answering the question without access to this visual content would risk providing an incorrect response or require you to say, 'I’m unable to answer this question.' The VisualAgent has both text and visual capibility, thus can provide you an accurate answer. 
            
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
            description: `Call this function when the content in a PDF contains concepts you don’t know,information not included in your training data, or when answering requires an internet search for current or up-to-date information. Also, call this agent whenever users ask questions that explicitly require current information or an internet search.
            
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
          await this.handleAudioMessage(message);
          break;

        case 'visual_query':
          // screenshot and pdf content result sent from frontend, it then call VisualAgent
          this.visualAgent.handleTextMessage(message.query, message.pdfContent, message.base64ImageSrc, message.chatHistory, message.call_id);
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
    // Don't process new audio if AI is speaking or not waiting for input
    if (this.isAISpeaking || !data.audio || data.audio.length === 0) {
      return;
    }

    if (this.openAIWs.readyState === WSType.OPEN) {
      if (!this.activeSession) {
        // Start new conversation
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

        this.activeSession = true;
      } else {
        // Append to existing conversation
        const audioEvent = {
          type: "input_audio_buffer.append",
          audio: data.audio
        };
        this.openAIWs.send(JSON.stringify(audioEvent));
      }
    }
  }

  private async handleOpenAIMessage(message: string) {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'session.created':
          // update session to add function call event
          if (this.sessionUpdateEvent) this.openAIWs.send(JSON.stringify(this.sessionUpdateEvent));
          break;

        case 'session.updated':
          console.log('Session settings updated');
          break;

        case 'conversation.item.created':
          // A new conversation item was created
          console.log('New conversation item created');
          break;

        case 'input_audio_buffer.speech_started':
          this.ws.send(JSON.stringify({
            type: 'input_audio_buffer.clear',
          }));
          break;

        // handle unhandled case error
        case 'input_audio_buffer.committed':
        case 'input_audio_buffer.speech_stopped':
        case 'input_audio_buffer.speech_ended':
        case 'response.created':
          console.log('response.created')
        case 'response.content_part.done':
          console.log('response.content_part.done')
        case 'response.output_item.done':
          console.log('response.output_item.done')
        case 'response.output_item.added':
          console.log('response.output_item.added')
        case 'response.content_part.added':
          console.log('response.content_part.added')
          break;

        case 'response.audio_transcript.delta':
          this.ws.send(JSON.stringify({
            type: 'audio_transcript',
            text: data.delta
          }));
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
          this.isAISpeaking = false;
          this.ws.send(JSON.stringify({
            type: 'audio_done'
          }));
          this.isProcessing = false;
          break;

        case 'response.audio_transcript.done':
          // Send complete transcript
          this.ws.send(JSON.stringify({
            type: 'transcript_done',
            text: data.transcript
          }));
          break;

        case 'response.done':
          this.isAISpeaking = false;
          this.activeSession = false;
          break;

        case 'conversation.item.input_audio_transcription.completed':
          console.log('conversation.item.input_audio_transcription.completed', data.transcript);
          // Send transcription to frontend to display user message
          this.ws.send(JSON.stringify({
            type: 'audio_user_message',  // New message type
            text: data.transcript
          }));
          break;

        case 'response.function_call_arguments.delta':
          console.log('response.function_call_arguments.delta');
          // Accumulate function call arguments
          if (!this.currentFunctionArgs) {
            this.currentFunctionArgs = '';
          }
          this.currentFunctionArgs += data.delta || '';
          break;

        case 'response.function_call_arguments.done':
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
          break;

        case 'end_audio_session':
          console.log('end_audio_session');
          this.isAISpeaking = false;
          this.activeSession = false;
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

        case 'error':
          console.error('OpenAI error:', data);
          if (data.error?.message === 'Conversation already has an active response') {
            // If we get this error, reset the session
            this.activeSession = false;
            const endSessionEvent = {
              type: "session.end"
            };
            this.openAIWs.send(JSON.stringify(endSessionEvent));
          }
          this.ws.send(JSON.stringify({
            type: 'error',
            error: data.error?.message || 'AI processing error'
          }));
          this.isProcessing = false;
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