import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Note } from "@/types/course";

interface NoteListSidebarProps {
  selectedCourseId: string;
  selectedLessonId: string;
  activeNoteId: number | null;
  setActiveNoteId: (id: number | null) => void;
  setActiveNoteContent: (content: string) => void;
  setActiveNoteTitle: (title: string) => void;
  setIsNoteMode: (isNoteMode: boolean) => void;
  currentPdfId: string;
  currentVideoId: string;
}

export default function NoteListSidebar({
  selectedCourseId,
  selectedLessonId,
  activeNoteId,
  setActiveNoteId,
  setActiveNoteContent,
  setActiveNoteTitle,
  setIsNoteMode,
  currentPdfId,
  currentVideoId
}: NoteListSidebarProps) {

  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!selectedLessonId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();

      // Set up the appropriate filters based on context
      if (currentPdfId) {
        params.append('resourceType', 'pdf');
        params.append('resourceId', currentPdfId);
      } else if (currentVideoId) {
        params.append('resourceType', 'video');
        params.append('resourceId', currentVideoId);
      } else {
        params.append('lessonId', selectedLessonId);
      }

      const response = await fetch(`/api/notes?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch notes');

      const data = await response.json();

      // Sort notes by update date, newest first
      const sortedNotes = (data.notes || []).sort((a: Note, b: Note) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setNotes(sortedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedLessonId, currentPdfId, currentVideoId]);

  useEffect(() => {
    if (selectedLessonId) {
      fetchNotes();
    }
  }, [selectedLessonId, currentPdfId, currentVideoId, fetchNotes]);

  const loadNote = async (noteId: number) => {
    try {
      const response = await fetch(
        `/api/notes/${noteId}`,
        { credentials: 'include' }
      );

      if (!response.ok) throw new Error('Failed to fetch note');

      const data = await response.json();

      setActiveNoteId(noteId);
      setActiveNoteContent(data.note.content);
      setActiveNoteTitle(data.note.title);
      setIsNoteMode(true);
    } catch (error) {
      console.error('Error loading note:', error);
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
          fetchNotes()
        }}
      >
        {isOpen ? <ChevronRight /> : <ChevronLeft />}
      </Button>

      <div className={`fixed right-0 top-0 h-full bg-white shadow-lg z-30 transition-all duration-300 ease-in-out ${isOpen ? 'w-72 translate-x-0' : 'w-0 translate-x-full'
        }`}>
        <div className="p-4 h-full overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Note History</h2>

          {loading ? (
            <div className="flex justify-center p-4">Loading...</div>
          ) : notes.length > 0 ? (
            <div className="space-y-2">
              {notes.map(note => (
                <div
                  key={note.id}
                  className={`p-3 rounded cursor-pointer transition-colors ${activeNoteId === note.id
                    ? 'bg-green-100 hover:bg-green-200 border-l-4 border-green-500'
                    : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  onClick={() => loadNote(note.id)}
                >
                  <div className="flex items-center gap-2">
                    <Edit size={16} className="shrink-0 text-green-600" />
                    <h3 className="font-medium text-sm truncate">
                      {note.title || `Note ${note.id}`}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 truncate pl-6">
                    {note.content.substring(0, 40)}{note.content.length > 40 ? '...' : ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 pl-6">
                    {new Date(note.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 p-4">
              No notes found
            </div>
          )}
        </div>
      </div>
    </>
  );
} 