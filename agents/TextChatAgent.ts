// New file
import { BaseAgent } from './BaseAgent';
import { CustomWebSocket } from '../types/websocket';
import { OpenAI } from 'openai';
import { ChatCompletionContentPartText } from 'openai/resources/chat/completions';

export class TextChatAgent extends BaseAgent {
  protected ws: CustomWebSocket;
  private openai: OpenAI;

  constructor(ws: CustomWebSocket, openAIWs: CustomWebSocket) {
    super(ws);
    this.ws = ws;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async handleMessage(data: any): Promise<void> {
    try {
      switch (data.type) {
        case 'text':
          await this.handleTextMessage(data.text, data.pdfContent, data.messages);
          break;
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

  async handleTextMessage(
    query: string,
    pdfContent: string,
    messages: {
      role: 'user' | 'assistant';
      content: string;
    }[] = [],
    base64ImageSrc: string = ''
  ) {
    const systemContent = `You are a very capable and responsible AI Assistant. You are helping FrontlineAgent to answer a user question using your knowledge and your visual capability. You are provided with the content of a full pdf paper and a screenshot of the current page which the user will ask your question about. You have to answer the user question based on the pdf content and the screenshot of the current page. Provide a correct answer as best as you can.`;

    const imageContent = base64ImageSrc.length > 0 ? [{
      type: 'image_url',
      image_url: {
        url: `data:image/png;base64,${base64ImageSrc}`,
        detail: 'high'
      }
    }] : [];
    console.log('aa', messages)
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-2024-11-20',
        messages: [
          {
            role: 'system',
            content: systemContent
          },
          ...messages,
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Question: ${query}\n\nPDF Content: ${pdfContent}`
              },
              ...imageContent
            ]
          }
        ],
        max_tokens: 1000
      });

      const message = completion.choices[0].message?.content ?? '';
      console.log("message", message)
      this.ws.send(JSON.stringify({
        type: 'text',
        text: message || "No response from expert agent",
      }));

      this.ws.send(JSON.stringify({
        type: 'text_done'
      }));

    } catch (error) {
      console.error('Error processing text input:', error);
      this.ws.send(JSON.stringify({
        type: "error",
        message: 'Unable to receive answer during chat with OpenAI API'
      }));
    }
  }

  cleanup(): void {
    // Implement cleanup logic
  }
}