// BaseAgent.ts
import { CustomWebSocket } from "../types/websocket";

// Update BaseAgent to use CustomWebSocket
export abstract class BaseAgent {
  protected ws: CustomWebSocket; // Update type to CustomWebSocket
  protected isProcessing: boolean = false;

  constructor(ws: CustomWebSocket) {
    this.ws = ws;
  }

  abstract handleMessage(message: any): Promise<void>;
  abstract cleanup(): void;
}
