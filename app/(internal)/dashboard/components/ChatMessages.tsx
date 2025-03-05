import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from "@/types/chat";

interface ChatMessagesProps {
  messages: ChatMessage[];
  transcript: string;
  error: string | null;
  courseId?: string;
  lessonId?: string;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, transcript, error, courseId, lessonId }) => {
  // Create a reference to scroll to bottom
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Update the scroll behavior
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

      {/* Main messages container with proper overflow handling */}
      <div
        className="flex-1 overflow-y-auto pb-4 space-y-4"
        ref={messagesEndRef}
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
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

        {transcript && (
          <div className="flex justify-end">
            <div className="max-w-3/4 px-4 py-2 rounded-lg bg-green-100 text-gray-800">
              {transcript}
            </div>
          </div>
        )}
      </div>

      {messages.length === 0 && !courseId && !lessonId && (
        <div className="text-yellow-600 p-3 border border-yellow-300 rounded-lg bg-yellow-50">
          Note: Chats will not be saved outside of course/lesson context
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
