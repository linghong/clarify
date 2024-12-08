import { WebSocket as WSType } from 'ws';

import { BaseAgent } from './BaseAgent';
import { MessageBroker } from '../server/services/MessageBroker';
import { CustomWebSocket } from '../types/websocket';

export class ResearchAgent extends BaseAgent {
  constructor(ws: CustomWebSocket, openAIWs: CustomWebSocket, messageBroker: MessageBroker) {
    super(ws);
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

  cleanup(): void {
    // Cleanup resources when agent is destroyed
  }
}