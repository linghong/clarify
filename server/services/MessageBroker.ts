export class MessageBroker {
  private subscribers: Map<string, Function[]> = new Map();

  subscribe(topic: string, callback: Function) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic)?.push(callback);
  }

  async publish(topic: string, message: any) {
    const callbacks = this.subscribers.get(topic) || [];
    await Promise.all(callbacks.map(callback => callback(message)));
  }
}