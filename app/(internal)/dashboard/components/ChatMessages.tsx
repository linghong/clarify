import React from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessagesProps {
  messages: Message[];
  transcript: string;
  error?: string | null;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, transcript, error }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !transcript && !error ? (
        <div className="text-gray-500 text-center py-4">
          Start a conversation...
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-lg p-3 ${message.role === 'user'
                  ? 'bg-teal-50 text-black'
                  : 'bg-gray-100 text-gray-900'
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

          {error && (
            <div className="flex justify-center">
              <div className="max-w-[90%] rounded-lg p-3 bg-red-50 text-red-700">
                ⚠️ {error}
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
};

export default ChatMessages;
