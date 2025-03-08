import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Chat, Message } from "@/types/course";

interface ChatListSidebarProps {
  selectedCourseId: string;
  selectedLessonId: string;
  activeChatId: string;
  setActiveChatId: (id: string) => void;
  setActiveChatTitle: (title: string) => void;
  setMessages: (messages: Message[]) => void;
  setMessageStart: (start: number) => void;
  currentPdfId: string;
  currentVideoId: string;
}

export default function ChatListSidebar({
  selectedCourseId,
  selectedLessonId,
  activeChatId,
  setActiveChatId,
  setActiveChatTitle,
  setMessages,
  setMessageStart,
  currentPdfId,
  currentVideoId
}: ChatListSidebarProps) {

  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchChats = useCallback(async () => {
    if (!selectedCourseId || !selectedLessonId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/chats`,
        { credentials: 'include' }
      );

      if (!response.ok) throw new Error('Failed to fetch chats');

      const data = await response.json();

      // Filter chats based on current file (PDF or video)
      let filteredChats = [...(data.chats || [])];

      if (currentPdfId) {
        filteredChats = filteredChats.filter(chat => chat.resourceId === parseInt(currentPdfId));
      } else if (currentVideoId) {
        filteredChats = filteredChats.filter(chat => chat.resourceId === parseInt(currentVideoId));
      }
      // Sort chats by creation date, newest first
      const sortedChats = filteredChats.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setChats(sortedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, selectedLessonId, currentPdfId, currentVideoId]);

  useEffect(() => {
    if (selectedCourseId && selectedLessonId) {
      fetchChats();
    }
  }, [selectedCourseId, selectedLessonId, currentPdfId, currentVideoId, fetchChats]);

  const loadChat = async (chatId: number) => {
    try {
      const response = await fetch(
        `/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/chats/${chatId}/messages`,
        { credentials: 'include' }
      );

      if (!response.ok) throw new Error('Failed to fetch chat messages');

      const data = await response.json();

      // Find the selected chat by ID instead of using array indexing
      const selectedChat = chats.find(chat => chat.id === chatId);
      if (selectedChat) {
        setActiveChatTitle(selectedChat.title);
      }

      setActiveChatId(chatId.toString());
      setMessageStart(data.messages.length)
      setMessages(data.messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt
      })));
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed right-0 top-1/2 transform -translate-y-1/2 z-40 bg-white shadow-md rounded-l-md rounded-r-none"
        onClick={() => {
          setIsOpen(!isOpen)
          fetchChats()
        }}
      >
        {isOpen ? <ChevronRight /> : <ChevronLeft />}
      </Button>

      <div className={`fixed right-0 top-0 h-full bg-white shadow-lg z-30 transition-all duration-300 ease-in-out ${isOpen ? 'w-72 translate-x-0' : 'w-0 translate-x-full'
        }`}>
        <div className="p-4 h-full overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Chat History</h2>

          {loading ? (
            <div className="flex justify-center p-4">Loading...</div>
          ) : chats.length > 0 ? (
            <div className="space-y-2">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`p-3 rounded cursor-pointer transition-colors ${activeChatId === chat.id.toString()
                    ? 'bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  onClick={() => loadChat(chat.id)}
                >
                  <h3 className="font-medium text-sm truncate">{chat.title}</h3>
                  <p className="text-xs text-gray-500">
                    {new Date(chat.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 p-4">
              No chat history found
            </div>
          )}
        </div>
      </div>
    </>
  );
} 