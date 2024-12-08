import { OpenAI } from 'openai';
import { WebSocket as WSType } from 'ws';
import { CustomWebSocket } from '../types/websocket';
import { BaseAgent } from './BaseAgent';
import { MessageBroker } from '../server/services/MessageBroker';

interface Base64ImageType {
  mimeType: string;
  base64Image: string;
}

export class ExpertAgent extends BaseAgent {
  protected ws: CustomWebSocket;
  private openAIWs: CustomWebSocket;
  private messageBroker: MessageBroker;
  private openai: OpenAI;

  constructor(ws: CustomWebSocket, openAIWs: CustomWebSocket, messageBroker: MessageBroker) {
    super(ws);
    this.ws = ws;
    this.openAIWs = openAIWs;
    this.messageBroker = messageBroker;
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
            text: data.text
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

  async handleTextMessage(query: string, pdfContent: string, base64ImageSrc: string, chatHistory: string): Promise<string> {
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
        max_tokens: 1000
      });

      const message = completion.choices[0].message?.content ?? '';
      console.log('AI message', message)
      return JSON.stringify({
        type: 'text',
        text: message
      });

    } catch (error) {
      console.error('Error processing text input:', error);
      return JSON.stringify({
        type: 'error',
        text: 'Failed to analyze the image and content'
      });
    }
  }

  cleanup(): void {
    // Implement cleanup logic
  }
}