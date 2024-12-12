import { BaseAgent } from './BaseAgent';
import { CustomWebSocket } from '../types/websocket';

export class ResearchAgent extends BaseAgent {
  protected ws: CustomWebSocket;
  private openAIWs: CustomWebSocket;

  constructor(ws: CustomWebSocket, openAIWs: CustomWebSocket) {
    super(ws);
    this.ws = ws;
    this.openAIWs = openAIWs;
  }

  async handleMessage(message: any): Promise<void> {
    try {
      switch (message.type) {
        case 'research':
          await this.handleTextMessage(
            message.question,
            message.reasonforquery, // chatHistory
            message.call_id
          );
          break;
        default:
          console.log('Unhandled message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      this.ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process research request'
      }));
    }
  }

  async handleTextMessage(query: string, reasonforquery: string, call_id: string) {
    const systemPrompt = `You are a helpful AI assistant with access to current information through internet search. Your task is to provide accurate and up-to-date information in response to the queries FrontlineAgent sends you.`;

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `query: ${query}
            reasonforquery: ${reasonforquery}`
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        return_citations: true,
        search_recency_filter: "month",
        stream: false
      })
    };

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', options);
      const result = await response.json();

      const message = result.choices[0].message.content;

      const eventResearch = {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          output: message || "No response from research agent",
          call_id: call_id
        }
      };

      this.openAIWs.send(JSON.stringify(eventResearch));
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