import React from 'react';
import { Edit, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import MediaUploader from './MediaUploader';

interface ChatHeaderProps {
  onCreateNewChat: () => void;
  onCreateNewNote: () => void;
  isNoteMode?: boolean;
  pdfUrl: string | null;
  handlePdfChange: (url: string, fileName: string) => void;
  handleVideoChange: (url: string, fileName: string) => void;
  videoUrl: string | null;
  selectedCourseId: string;
  selectedLessonId: string;
  setSelectedCourseId: (id: string) => void;
  setSelectedLessonId: (id: string) => void;
  setCurrentPdfId: (id: string) => void;
  setCurrentVideoId: (id: string) => void;
  setActiveChatId: (id: string) => void;
  resetChat: () => void;
  setSelectedCourseName: (name: string) => void;
  setSelectedLessonName: (name: string) => void;
}

const ChatHeader = ({
  onCreateNewChat,
  onCreateNewNote,
  isNoteMode = false,
  pdfUrl,
  handlePdfChange,
  handleVideoChange,
  videoUrl,
  selectedCourseId,
  selectedLessonId,
  setSelectedCourseId,
  setSelectedLessonId,
  setCurrentPdfId,
  setCurrentVideoId,
  setActiveChatId,
  resetChat,
  setSelectedCourseName,
  setSelectedLessonName
}: ChatHeaderProps) => {
  return (
    <div className="p-3 border-b flex justify-between items-center">
      <MediaUploader
        pdfUrl={pdfUrl}
        handlePdfChange={handlePdfChange}
        handleVideoChange={handleVideoChange}
        videoUrl={videoUrl}
        selectedCourseId={selectedCourseId}
        selectedLessonId={selectedLessonId}
        setSelectedCourseId={setSelectedCourseId}
        setSelectedLessonId={setSelectedLessonId}
        setCurrentPdfId={setCurrentPdfId}
        setCurrentVideoId={setCurrentVideoId}
        setActiveChatId={setActiveChatId}
        resetChat={resetChat}
        setSelectedCourseName={setSelectedCourseName}
        setSelectedLessonName={setSelectedLessonName}
      />
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