"use client";

import { useState, useEffect } from "react";
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
  // Add this state for textarea height

  // Add this function to handle textarea resize
  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentTyping(e.target.value);
    // Reset height to auto to get the right scrollHeight
    e.target.style.height = 'auto';
    // Set new height based on scrollHeight (with max-height limit)
    const newHeight = Math.min(e.target.scrollHeight, 200) + 'px';
    setTextareaHeight(newHeight);
  };
  return (
    <>
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
        className="flex-1 min-w-0 rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
        style={{
          height: textareaHeight,
          minHeight: '40px',
          maxHeight: '200px'
        }}
      />
      <Button
        onClick={handleSendMessage}
        disabled={isAIResponding || !currentTyping.trim()}
        className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
      >
        Send
      </Button>
    </>
  );
};

export default ChatInput;
