import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface ChatHeaderProps {
  title: string;
  onCreateNewChat: () => void;
}

export default function ChatHeader({ title, onCreateNewChat }: ChatHeaderProps) {
  return (
    <div className="flex justify-between items-center p-2 border-b border-gray-200 bg-gray-50 w-full h-[38px] sticky top-0 z-10">
      <div className="flex-1 pr-4">
        <h4 className="text-md font-medium text-gray-700 truncate">
          {title || ""}
        </h4>
      </div>
      <Button
        variant="ghost"
        onClick={onCreateNewChat}
        title="Start new chat"
        className="shrink-0 "
      >
        <PlusCircle className="h-5 w-5" />
        <span className="ml-2">New Chat</span>
      </Button>
    </div>
  );
} 