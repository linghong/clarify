import { MessageBroker } from './MessageBroker';
import { BaseAgent } from '../../agents/BaseAgent';

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent> = new Map();
  private messageBroker: MessageBroker;

  private constructor() {
    this.messageBroker = new MessageBroker();
  }

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  registerAgent(userId: string, agent: BaseAgent) {
    this.agents.set(userId, agent);
  }

  getAgent(userId: string): BaseAgent | undefined {
    return this.agents.get(userId);
  }

  getMessageBroker(): MessageBroker {
    return this.messageBroker;
  }
}