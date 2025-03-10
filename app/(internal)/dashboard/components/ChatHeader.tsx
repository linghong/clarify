import { Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  title: string;
  onCreateNewChat: () => void;
  onCreateNewNote?: () => void;
}

const ChatHeader = ({ title, onCreateNewChat, onCreateNewNote }: ChatHeaderProps) => {
  return (
    <div className="flex items-center justify-between border-b p-3">
      <div className="font-medium truncate">{title || "New"}</div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-dashed flex items-center gap-1"
          onClick={onCreateNewChat}
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </Button>

        {onCreateNewNote && (
          <Button
            variant="outline"
            size="sm"
            className="border-dashed flex items-center gap-1"
            onClick={onCreateNewNote}
          >
            <Edit className="h-4 w-4" />
            <span>Write Note</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default ChatHeader; 