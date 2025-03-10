import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/common/Toast";

interface NoteEditorProps {
  resourceType: 'pdf' | 'video' | 'lesson';
  resourceId: number;
  lessonId: number;
  courseId: number;
  initialNote?: string;
  noteId?: number;
  onSave: () => void;
  onCancel: () => void;
}

const NoteEditor = ({
  resourceType,
  resourceId,
  lessonId,
  courseId,
  initialNote = '',
  noteId,
  onSave,
  onCancel
}: NoteEditorProps) => {
  const [noteContent, setNoteContent] = useState(initialNote);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setNoteContent(initialNote);
  }, [initialNote]);

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

      addToast({
        title: "Success",
        description: noteId ? "Note updated" : "Note created",
      });

      onSave();
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
      <div className="p-3 font-medium border-b">
        {noteId ? 'Edit Note' : 'New Note'} ({resourceType})
      </div>

      <div className="flex-grow p-3">
        <Textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Write your notes here..."
          className="w-full h-full min-h-[300px] resize-none"
        />
      </div>

      <div className="p-3 border-t flex justify-end gap-2">
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