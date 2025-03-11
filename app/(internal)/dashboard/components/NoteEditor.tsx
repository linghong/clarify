import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/common/Toast";

interface NoteEditorProps {
  resourceType: 'pdf' | 'video' | 'lesson';
  resourceId: number;
  lessonId: number;
  courseId: number;
  initialNote?: string;
  initialTitle?: string;
  noteId?: number;
  onSave: (noteId: number, title: string, content: string) => void;
  onCancel: () => void;
}

const NoteEditor = ({
  resourceType,
  resourceId,
  lessonId,
  courseId,
  initialNote = '',
  initialTitle = '',
  noteId,
  onSave,
  onCancel
}: NoteEditorProps) => {
  const [noteContent, setNoteContent] = useState(initialNote);
  const [noteTitle, setNoteTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setNoteContent(initialNote);
    setNoteTitle(initialTitle);
  }, [initialNote, initialTitle]);

  // Generate a title if none exists
  useEffect(() => {
    if (!noteTitle && !noteId) {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:.]/g, '');

      // For lesson notes, ensure we're using a valid ID
      let idToUse = resourceId;

      // If resourceType is 'lesson', ensure we're using lessonId
      if (resourceType === 'lesson' && (!idToUse || isNaN(idToUse))) {
        idToUse = lessonId;
      }

      // Generate a safe title that won't cause errors
      const defaultTitle = `${resourceType}-${idToUse || 'unknown'}-note-${timestamp.substring(0, 14)}`;
      setNoteTitle(defaultTitle);
    }
  }, [resourceType, resourceId, lessonId, noteTitle, noteId]);

  const handleSave = async () => {
    if (!noteContent.trim()) {
      addToast({
        title: "Error",
        description: "Note cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const method = noteId ? 'PUT' : 'POST';
      const endpoint = noteId
        ? `/api/notes/${noteId}`
        : `/api/notes`;

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          resourceType,
          resourceId,
          lessonId,
          courseId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      const data = await response.json();

      addToast({
        title: "Success",
        description: noteId ? "Note updated" : "Note created",
      });

      onSave(data.note?.id || noteId, noteTitle, noteContent);
    } catch (error) {
      console.error('Error saving note:', error);
      addToast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-row justify-between items-center border-b sticky top-[49px] bg-white z-10">
        <label className="text-base bg-gray-50 rounded-l-md item-center font-medium p-2">Title</label>
        <Input
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
          placeholder="Note title"
          className="w-full"
        />
      </div>

      <div className="flex-grow p-3 overflow-y-auto h-[calc(100vh-220px)]">
        <Textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Write your notes here..."
          className="w-full h-full min-h-[300px] resize-none"
        />
      </div>

      <div className="p-3 border-t sticky bottom-0 bg-white z-10 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !noteContent.trim()}
        >
          {isSaving ? 'Saving...' : (noteId ? 'Update' : 'Save')}
        </Button>
      </div>
    </div>
  );
};

export default NoteEditor; 