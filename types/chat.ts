import { Chat } from "@/entities/Lesson";

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  item_id?: string;
}

export interface ChatResponse {
  chat?: Chat;
  error?: string;
} 