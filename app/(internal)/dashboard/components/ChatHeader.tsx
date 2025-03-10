import React from 'react';
import { Plus, Edit, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  title: string;
  onCreateNewChat: () => void;
  onCreateNewNote: () => void;
  isNoteMode?: boolean;
}

const ChatHeader = ({ title, onCreateNewChat, onCreateNewNote, isNoteMode = false }: ChatHeaderProps) => {
  return (
    <div className="p-3 border-b flex justify-between items-center">
      <div className="font-medium truncate pr-2">
        {title || 'New Conversation'}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={isNoteMode ? "outline" : "default"}
          onClick={onCreateNewChat}
          title="Start a new chat"
        >
          <MessageSquare size={16} className="mr-1" />
          <span>New Chat</span>
        </Button>
        <Button
          size="sm"
          variant={isNoteMode ? "default" : "outline"}
          onClick={onCreateNewNote}
          title="Write a note"
        >
          <Edit size={16} className="mr-1" />
          <span>Write Note</span>
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader; 