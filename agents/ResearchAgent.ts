import { BaseAgent } from './BaseAgent';
import { MessageBroker } from '../server/services/MessageBroker';
import { CustomWebSocket } from '../types/websocket';

export class ResearchAgent extends BaseAgent {
  protected ws: CustomWebSocket;
  private openAIWs: CustomWebSocket;
  private messageBroker: MessageBroker;

  constructor(ws: CustomWebSocket, openAIWs: CustomWebSocket, messageBroker: MessageBroker) {
    super(ws);
    this.ws = ws;
    this.openAIWs = openAIWs;
    this.messageBroker = messageBroker;
    this.setupMessageBroker(messageBroker);
  }

  private setupMessageBroker(messageBroker: MessageBroker) {
    messageBroker.subscribe('research.request', this.handleResearchRequest.bind(this));
  }

  async handleMessage(message: any): Promise<void> {
    // Handle incoming messages
  }

  private async handleResearchRequest(message: any): Promise<void> {
    // Handle research request logic here
  }

  async handleTextMessage(query: string, pdfContent: string, base64ImageSrc: string, chatHistory: string, call_id: string) {
    const systemPrompt = `You are a very capable and responsible AI Assistant. You are helping FrontlineAgent to answer a user question using your internet search capability. Search internet for the answer to the user question. Provide a correct answer as best as you can.`;

    const options = {
      method: 'POST',
      headers: {
        Authorization: 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: `{
      "model":"llama-3.1-sonar-small-128k-online",
      "messages":[{
      "role":"system",
      "content":"${systemPrompt}"
      },
      {
      "role":"user",
      "content":"${query}"
      }],
      "max_tokens":"Optional",
      "temperature":0.2,
      "top_p":0.9,
      "search_domain_filter":["perplexity.ai"],
      "return_images":false,
      "return_related_questions":false,"search_recency_filter":"month",
      "top_k":0,
      "stream":false,
      "presence_penalty":0,
      "frequency_penalty":1}`
    };

    try {
      const completion = await fetch('https://api.perplexity.ai/chat/completions', options);

      const message = completion.json();

      const eventExpert = {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          output: message || "No response from expert agent",
          call_id: call_id
        }
      };

      this.openAIWs.send(JSON.stringify(eventExpert));
      this.openAIWs.send(JSON.stringify({ type: "response.create" }));

    } catch (error) {
      console.error('Error processing text input:', error);
      const eventExpert = {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          output: 'Failed to analyze the image and content',
          call_id: call_id
        }
      };

      this.openAIWs.send(JSON.stringify(eventExpert));
      this.openAIWs.send(JSON.stringify({ type: "response.create" }));
    }
  }

  cleanup(): void {
    // Cleanup resources when agent is destroyed
  }
}