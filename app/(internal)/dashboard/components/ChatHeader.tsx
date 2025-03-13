import React from 'react';
import { Edit, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import MediaUploader from './MediaUploader';

interface ChatHeaderProps {
  contentSource: 'text-chat' | 'voice-chat' | 'note';
  switchContentMode: (contentSource: 'text-chat' | 'voice-chat' | 'note') => void;
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
  setSelectedCourseName: (name: string) => void;
  setSelectedLessonName: (name: string) => void;
}

const ChatHeader = ({
  contentSource = 'text-chat',
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
  switchContentMode,
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
        contentSource={contentSource}
        switchContentMode={switchContentMode}
        setSelectedCourseName={setSelectedCourseName}
        setSelectedLessonName={setSelectedLessonName}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={contentSource === 'text-chat' ? "default" : "outline"}
          onClick={() => switchContentMode('text-chat')}
          title="Start a new chat"
        >
          <MessageSquare size={16} className="mr-1" />
          <span>New Chat</span>
        </Button>
        <Button
          size="sm"
          variant={contentSource === 'note' ? "default" : "outline"}
          onClick={() => switchContentMode('note')}
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