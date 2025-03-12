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
  isNoteMode: boolean;

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
  isNoteMode,
  currentPdfId,
  currentVideoId
}: SidebarContainerProps) {

  return (
    <>
      {/* Only render the currently active sidebar type */}
      {isNoteMode ? (
        <NoteListSidebar
          selectedLessonId={selectedLessonId}
          activeNoteId={activeNoteId}
          setActiveNoteId={setActiveNoteId}
          setActiveNoteContent={setActiveNoteContent}
          setActiveNoteTitle={setActiveNoteTitle}
          currentPdfId={currentPdfId}
          currentVideoId={currentVideoId}
        />

      ) : (
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
      )}
    </>
  );
} 