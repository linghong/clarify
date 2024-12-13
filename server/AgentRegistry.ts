import { BaseAgent } from '../agents/BaseAgent';

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent> = new Map();

  private constructor() {
    // Remove messageBroker initialization
  }

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  registerAgent(key: string, agent: BaseAgent): void {
    this.agents.set(key, agent);
  }

  getAgent(key: string): BaseAgent | undefined {
    return this.agents.get(key);
  }
}