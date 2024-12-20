import { OpenAI } from 'openai';
import { CustomWebSocket } from '../types/websocket';
import { BaseAgent } from './BaseAgent';

export class VisualAgent extends BaseAgent {
  protected ws: CustomWebSocket;
  private openAIWs: CustomWebSocket;
  private openai: OpenAI;

  constructor(ws: CustomWebSocket, openAIWs: CustomWebSocket) {
    super(ws);
    this.ws = ws;
    this.openAIWs = openAIWs;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async handleMessage(data: any): Promise<void> {
    try {
      switch (data.type) {
        // Send the question to the frontend to take a screenshot
        case 'capture_screenshot':
          await this.ws.send(JSON.stringify({
            type: 'capture_screenshot',
            text: data.text,
            call_id: data.call_id
          }));
          break;
        default:
          console.log('Unhandled message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      this.ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process message'
      }));
    }
  }

  async handleTextMessage(query: string, pdfContent: string, base64ImageSrc: string, chatHistory: string, call_id: string) {
    const systemContent = `You are a very capable and responsible AI Assistant. You are helping FrontlineAgent to answer a user question using your knowledge and your visual capability. You are provided with the content of a full pdf paper and a screenshot of the current page which the user will ask your question about. You have to answer the user question based on the pdf content and the screenshot of the current page. Provide a correct answer as best as you can.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-2024-11-20',
        messages: [
          {
            role: 'system',
            content: systemContent
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Question: ${query}\n\nPDF Content: ${pdfContent}\n\nChat History: ${chatHistory}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64ImageSrc}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
        max_tokens: 16384
      });

      const message = completion.choices[0].message?.content ?? '';

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
    // Implement cleanup logic
  }
}