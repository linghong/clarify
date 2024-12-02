import { BaseAgent } from './BaseAgent';
import { MessageBroker } from '../services/MessageBroker';

export class ResearchAgent extends BaseAgent {
  constructor(ws: WebSocket, messageBroker: MessageBroker) {
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