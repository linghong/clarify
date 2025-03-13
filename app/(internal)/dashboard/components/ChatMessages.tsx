import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from "@/types/chat";
import { Input } from '@/components/ui/input';

interface ChatMessagesProps {
  messages: ChatMessage[];
  transcript: string;
  error: string | null;
  courseId?: string;
  lessonId?: string;
  chatTitle?: string;
  setChatTitle: (title: string) => void;
  resourceType?: string;
  resourceId?: number;
  contentSource: 'text-chat' | 'voice-chat' | 'note';
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  transcript,
  error,
  courseId,
  lessonId,
  chatTitle,
  setChatTitle,
  resourceType,
  resourceId,
  contentSource
}) => {

  // Generate a title if none exists
  useEffect(() => {
    if (!chatTitle) {
      if (!courseId || !lessonId || !resourceType || !resourceId) {
        //Invalid courseId or lessonId or resourceType or resourceId
        return;
      }

      // Generate a safe title that won't cause errors
      const defaultTitle = `${resourceType}${resourceId.toString()}-${contentSource}-${new Date().toLocaleString()}`;
      setChatTitle(defaultTitle);
    }
  }, [contentSource, resourceType, resourceId, lessonId, chatTitle]);

  // Create a reference to scroll to bottom
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  // Scroll to bottom when messages change
  React.useEffect(() => {
    scrollToBottom();
  }, [messages, transcript]);

  return (
    <div className="flex flex-col h-full">
      {error && <div className="p-3 bg-red-100 text-red-700 mb-2 rounded">{error}</div>}

      {/* Title input section */}
      <div className="mb-4 border-b pb-3">
        <div className="flex flex-row justify-between items-center">
          <label className="text-base bg-gray-50 rounded-l-md item-center font-medium p-2">Title</label>
          <Input
            value={chatTitle}
            onChange={(e) => setChatTitle(e.target.value)}
            placeholder="Chat title"
            className="w-full"
          />
        </div>
      </div>

      {/* Main messages container with proper overflow handling */}
      <div
        className="flex-1 overflow-y-auto pb-4 space-y-4"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {messages.length === 0 && !transcript && !error ? (
          <div className="font-bold text-gray-500 text-center py-4">
            Start a conversation with AI...
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3/4 px-4 py-2 rounded-lg ${message.role === 'user'
                    ? 'bg-blue-100 text-gray-800'
                    : 'bg-gray-100 text-gray-800'
                    }`}
                >
                  {message.role === 'user' ? (
                    message.content
                  ) : (
                    <ReactMarkdown
                      className="prose prose-sm max-w-none"
                      components={{
                        p: ({ children }) => <p className="mb-2">{children}</p>,
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-md font-bold mb-2">{children}</h3>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        code: ({ children }) => <code className="bg-gray-200 px-1 rounded">{children}</code>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 0 && !courseId && !lessonId && (
        <div className="text-yellow-600 font-semibold p-3 mb-10 border border-yellow-300 rounded-lg bg-yellow-50">
          Note: Chats will not be created outside of course/lesson context. Add a course and lesson to save your chat.
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
