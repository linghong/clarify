import { WebSocket as WSType } from 'ws';
import { BaseAgent } from './BaseAgent';
import { MessageBroker } from '../server/services/MessageBroker';
import { CustomWebSocket } from '../types/websocket';
import { ExpertAgent } from './ExpertAgent';
import { ResearchAgent } from './ResearchAgent';

export class FrontlineAgent extends BaseAgent {
  protected ws: CustomWebSocket;
  private openAIWs: CustomWebSocket;
  private messageBroker: MessageBroker;
  protected isProcessing: boolean = false;
  private expertAgent: ExpertAgent;
  private researchAgent: ResearchAgent;
  private activeSession: boolean = false;

  private functionCallEvent = {
    type: 'session.update',
    session: {
      instructions: `
       You are a helpful real-time voice AI assistant. Your main goal is to help users understand the content they share with you. You work seamlessly with your AI colleagues, ExpertAgent and ResearchAgent, as a team. As the frontline agent, your role is to interact with users, answer their questions. When you are unable to answer the questions, don't say "No", instead, yoou should delegate tasks or queries to your colleagues . The ExpertAgent handles visual data, so any queries about screen or browser contents or articles they opened in their computer should also be directed to the ExpertAgent. For queries needing current information or internet searches, involve the ResearchAgent. Always identify when a user's question requires real-time or up-to-date information, and promptly use the ResearchAgent in such cases. While waiting for responses from your colleagues, inform users that you are looking into their request. Use this time to gather more details from the user. Once you receive your colleague's response, combine all information into a comprehensive answer. Remember, you represent the whole team, not just yourself, so never disclose that you have colleagues.`,
      voice: "alloy",
      modalities: ["text", "audio"],
      tool_choice: "auto",
      "turn_detection": {
        "type": "server_vad",
        "threshold": 0.5,
        "prefix_padding_ms": 300,
        "silence_duration_ms": 500
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
          name: 'inquiry_expert_agent',
          type: 'function',
          description: 'call this function when a user message mentions some visual content such as charts, graphs,tables,or currently opened browser in user\'s computer, etc., and you will risk to provide incorrect answer without those visual content or have to say I\'m unable to answer this question. The ExpertAgent has both text and visual capibility, thus can provide you the answer. When you are waiting for the ExpertAgent to respond from your inquiry function call, you can tell your user to let know you need some time to look at the content or you need to think about it to get the answer, or you can use that time to gather more information from the user that you think will help your user understand your answer better, such as user\'s background and previous knowldege about the related topic.',
          parameters: {
            type: 'object',
            properties: {
              user_question: {
                type: 'string',
                description: "The user questions you want to get answered from the user's visual input"
              },
              function_name: {
                type: 'string',
                description: "The name of the function you want to call, i.e. inquiry_expert_agent"
              }
            },
            required: ["user_question", "function_name"],
          }
        },
        {
          name: 'inquiry_research_agent',
          type: 'function',
          description: 'call this function when  the pdf content contains some concept you don\'t know, very recently that are not in your trained pool,that require current or up-to-date information from the internet, or when the answer requires internet search. When you are waiting for the research agent to respond from your inquiry, you can tell your user to let know you need some time to research the internet to get the answer, or you can use that time to gather more information from the user that you think will help your user understand your answer better, such as user\'s background and previous knowldege about the related topic. Also call this agent, when users asks questions that require current information or internet search.',
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
                description: "Very breifiely explain what you are aims for for the answer, why you needs it, so that the ResearchAgent can understand the context of the query and provide a more accurate answer."
              }
            },
            required: ["question", "function_name", "reasonforquery"],
          }
        }
      ]
    }
  };

  constructor(ws: CustomWebSocket, openAIWs: CustomWebSocket, messageBroker: MessageBroker) {
    super(ws);
    this.ws = ws;
    this.openAIWs = openAIWs;
    this.messageBroker = messageBroker;
    this.expertAgent = new ExpertAgent(ws, openAIWs, messageBroker);
    this.researchAgent = new ResearchAgent(ws, openAIWs, messageBroker);
    this.setupWebSocketHandlers()
  }

  private setupWebSocketHandlers() {
    this.openAIWs.on('message', this.handleOpenAIMessage.bind(this));
    this.openAIWs.on('error', this.handleOpenAIError.bind(this));
  }

  // handle message from frontend
  async handleMessage(message: any): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    console.log('message.type', message.type)
    try {
      switch (message.type) {
        case 'text' || 'pdf_content':
          await this.handleTextMessage(message);
          break;

        case 'audio':
          await this.handleAudioMessage(message);
          break;

        case 'visual_query':
          // handle screenshot and pdf content result from frontend and send it to openai GPT4o
          this.expertAgent.handleTextMessage(message.query, message.pdfContent, message.base64ImageSrc, message.chatHistory, message.call_id);
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
    if (this.openAIWs.readyState === WSType.OPEN) {
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

        if (data.endOfSpeech) {
          // If this is the end of speech, create response
          const createResponseEvent = {
            type: "response.create",
            response: {
              modalities: ['text', 'audio'],
              instructions: "Respond naturally and conversationally.",
            },
          };
          this.openAIWs.send(JSON.stringify(createResponseEvent));
        }
        this.activeSession = true;
      } else {
        // Append to existing conversation
        const audioEvent = {
          type: "input_audio_buffer.append",
          audio: data.audio
        };
        this.openAIWs.send(JSON.stringify(audioEvent));

        if (data.endOfSpeech) {
          // End current input and get AI response
          const endInputEvent = {
            type: "input_audio_buffer.end"
          };
          this.openAIWs.send(JSON.stringify(endInputEvent));

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
  }

  private async handleOpenAIMessage(message: string) {
    try {
      const data = JSON.parse(message.toString());
      console.log('handleOpenAIMessage in frontlineAgent , data.type', data.type);

      switch (data.type) {
        case 'session.created':
          // update session to add function call event
          if (this.functionCallEvent) this.openAIWs.send(JSON.stringify(this.functionCallEvent));
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

        case 'input_audio_buffer.speech_started':
          this.ws.send(JSON.stringify({
            type: 'input_audio_buffer.clear',
          }));
          break;

        case 'response.done':
          this.activeSession = false;
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

        case 'response.function_call_arguments.done':
          // Parse the arguments string into an object
          const args = typeof data.arguments === 'string'
            ? JSON.parse(data.arguments)
            : data.arguments;

          switch (args.function_name) {
            case 'inquiry_expert_agent':
              this.expertAgent.handleMessage({
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