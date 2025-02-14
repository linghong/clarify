export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  item_id?: string;
} 