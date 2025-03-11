import { useState, useEffect } from 'react';
import ChatListSidebar from './ChatListSidebar';
import NoteListSidebar from './NoteListSidebar';
import { ChatMessage } from '@/types/chat';

interface SidebarContainerProps {
  selectedCourseId: string;
  selectedLessonId: string;

  // Chat props
  activeChatId: string;
  setActiveChatId: (id: string) => void;
  setActiveChatTitle: (title: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setMessageStart: (start: number) => void;

  // Note props
  activeNoteId: number | null;
  setActiveNoteId: (id: number | null) => void;
  setActiveNoteContent: (content: string) => void;
  setActiveNoteTitle: (title: string) => void;
  setIsNoteMode: (isNoteMode: boolean) => void;

  // Resource props
  currentPdfId: string;
  currentVideoId: string;
}

export default function SidebarContainer({
  selectedCourseId,
  selectedLessonId,
  activeChatId,
  setActiveChatId,
  setActiveChatTitle,
  setMessages,
  setMessageStart,
  activeNoteId,
  setActiveNoteId,
  setActiveNoteContent,
  setActiveNoteTitle,
  setIsNoteMode,
  currentPdfId,
  currentVideoId
}: SidebarContainerProps) {
  // Track which sidebar should be visible when open
  const [activeMode, setActiveMode] = useState<'chat' | 'note'>('chat');

  // Update the active mode based on which content is currently shown
  useEffect(() => {
    if (activeNoteId !== null) {
      setActiveMode('note');
    } else if (activeChatId) {
      setActiveMode('chat');
    }
  }, [activeNoteId, activeChatId]);

  return (
    <>
      {/* Only render the currently active sidebar type */}
      {activeMode === 'chat' ? (
        <ChatListSidebar
          selectedCourseId={selectedCourseId}
          selectedLessonId={selectedLessonId}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          setActiveChatTitle={setActiveChatTitle}
          setMessages={setMessages}
          setMessageStart={setMessageStart}
          currentPdfId={currentPdfId}
          currentVideoId={currentVideoId}
        />
      ) : (
        <NoteListSidebar
          selectedLessonId={selectedLessonId}
          activeNoteId={activeNoteId}
          setActiveNoteId={setActiveNoteId}
          setActiveNoteContent={setActiveNoteContent}
          setActiveNoteTitle={setActiveNoteTitle}
          setIsNoteMode={setIsNoteMode}
          currentPdfId={currentPdfId}
          currentVideoId={currentVideoId}
        />
      )}
    </>
  );
} 