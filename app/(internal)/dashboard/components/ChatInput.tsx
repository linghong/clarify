import { Button } from "@/components/ui/button";

interface ChatInputProps {
  currentTyping: string;
  setCurrentTyping: (value: string) => void;
  handleSendMessage: () => void;
  isAIResponding: boolean;
  textareaHeight: string;
  setTextareaHeight: (value: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  currentTyping,
  setCurrentTyping,
  handleSendMessage,
  isAIResponding,
  textareaHeight,
  setTextareaHeight,
}) => {
  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentTyping(e.target.value);
    e.target.style.height = 'auto';
    const newHeight = Math.min(e.target.scrollHeight, 200) + 'px';
    setTextareaHeight(newHeight);
  };

  return (
    <div className="flex w-full gap-2">
      <textarea
        value={currentTyping}
        onChange={handleTextareaResize}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
        disabled={isAIResponding}
        placeholder="Type your message and send..."
        className="flex-1 rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
        style={{
          height: textareaHeight,
          minHeight: '40px',
          maxHeight: '200px'
        }}
      />
      <Button
        onClick={handleSendMessage}
        disabled={isAIResponding || !currentTyping.trim()}
        className="bg-gray-600 hover:bg-gray-700 text-white shrink-0"
      >
        Send
      </Button>
    </div>
  );
};

export default ChatInput;
