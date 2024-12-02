export abstract class BaseAgent {
  protected ws: WebSocket;
  protected isProcessing: boolean = false;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  abstract handleMessage(message: any): Promise<void>;
  abstract cleanup(): void;
}