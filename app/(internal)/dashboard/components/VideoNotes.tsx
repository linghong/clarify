import React, { useState, useEffect } from 'react';
import { Play, Plus, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utilityUtils';

interface VideoNote {
  id: number;
  timestamp: number;
  note: string;
  label?: string;
  createdAt: string;
}

interface VideoNotesProps {
  videoId: string;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export default function VideoNotes({ videoId, videoRef }: VideoNotesProps) {
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch existing notes
  useEffect(() => {
    const fetchNotes = async () => {
      if (!videoId) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/videos/${videoId}/bookmarks`);

        if (!res.ok) {
          throw new Error('Failed to fetch notes');
        }

        const data = await res.json();
        setNotes(data.bookmarks || []);
      } catch (err) {
        console.error('Error fetching notes:', err);
        setError('Failed to load notes');
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [videoId]);

  // Add a new note at current timestamp
  const addNote = async () => {
    if (!videoRef.current || !newNote.trim()) return;

    const currentTime = videoRef.current.currentTime;

    try {
      const res = await fetch(`/api/videos/${videoId}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: currentTime,
          note: newNote,
          label: newLabel || undefined
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to add note');
      }

      const data = await res.json();
      setNotes([...notes, data.bookmark]);
      setNewNote('');
      setNewLabel('');
      setIsAddingNote(false);
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Failed to add note');
    }
  };

  // Delete a note
  const deleteNote = async (id: number) => {
    try {
      const res = await fetch(`/api/videos/${videoId}/bookmarks/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete note');
      }

      setNotes(notes.filter(note => note.id !== id));
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note');
    }
  };

  // Jump to timestamp when clicking on a note
  const jumpToTimestamp = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      videoRef.current.play().catch(err => console.error('Error playing video:', err));
    }
  };

  return (
    <div className="flex-grow overflow-auto px-2 py-2 rounded-lg shadow-sm border border-gray-200 mt-2 mb-2">
      <div className="flex justify-between bg-emerald-50 border-b-2 items-center border-b border-gray-200 sticky top-0 z-10">
        <h3 className="px-2 py-1 text-lg font-medium text-gray-900">Video Bookmark Notes</h3>
        <Button
          size="sm"
          onClick={() => setIsAddingNote(!isAddingNote)}
          variant="outline"
          className="rounded-full w-6 h-6 p-0 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {isAddingNote && (
        <div className="mb-1 p-1 bg-gray-50 rounded-md ">
          <div className="flex items-center mb-1">
            <span className="text-sm font-medium text-gray-700 mr-2">
              Current time: {videoRef.current ? formatTime(videoRef.current.currentTime) : "0:00"}
            </span>
          </div>
          <input
            type="text"
            placeholder="Optional label (e.g., 'Important concept')"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full p-2 mb-2 text-sm border border-gray-300 rounded focus:ring-emerald-500 focus:border-emerald-500"
          />
          <textarea
            placeholder="Your note here..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full h-20 p-2 text-sm border border-gray-300 rounded focus:ring-emerald-500 focus:border-emerald-500"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={addNote}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!newNote.trim()}
            >
              Save Note
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="py-5 text-gray-500 text-md italic">No notes yet. Add your first note by clicking the button above.</p>
      ) : (
        <div className="space-y-1 max-h-100 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-3 bg-white border border-gray-100 rounded-md mb-3 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <button
                  onClick={() => jumpToTimestamp(note.timestamp)}
                  className="flex items-center text-emerald-600 hover:text-emerald-800 font-medium"
                >
                  <Play className="h-3 w-3 mr-1" />
                  {formatTime(note.timestamp)}
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
              {note.label && (
                <div className="mt-1 mb-1">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                    {note.label}
                  </span>
                </div>
              )}
              <p className="mt-1 text-sm text-gray-700">{note.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 