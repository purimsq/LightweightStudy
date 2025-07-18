import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, FileText, Plus, Edit3, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Note {
  id: number;
  documentId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesPageProps {
  documentId: string;
}

export default function NotesPage({ documentId }: NotesPageProps) {
  const [location, setLocation] = useLocation();
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch document details
  const { data: document } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
  });

  // Fetch notes for this document
  const { data: notes = [], isLoading } = useQuery({
    queryKey: [`/api/documents/${documentId}/notes`],
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: { title: string; content: string }) => {
      const response = await fetch(`/api/documents/${documentId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteData),
      });
      if (!response.ok) throw new Error("Failed to create note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/notes`] });
      setNewNote({ title: "", content: "~ " });
      toast({ title: "Note created successfully!" });
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async (note: Note) => {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: note.title, content: note.content }),
      });
      if (!response.ok) throw new Error("Failed to update note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/notes`] });
      setEditingNote(null);
      toast({ title: "Note updated successfully!" });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete note");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/notes`] });
      toast({ title: "Note deleted successfully!" });
    },
  });

  const goBack = () => {
    setLocation(`/documents/${documentId}`);
  };

  const handleCreateNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim() || newNote.content.trim() === "~") {
      toast({ title: "Please fill in both title and content", variant: "destructive" });
      return;
    }
    createNoteMutation.mutate(newNote);
  };

  const handleUpdateNote = () => {
    if (!editingNote) return;
    updateNoteMutation.mutate(editingNote);
  };

  const handleDeleteNote = (noteId: number) => {
    if (confirm("Are you sure you want to delete this note?")) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  // Format content with ~ bullets for display
  const formatContentForDisplay = (content: string) => {
    if (!content) return "";
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => line.startsWith('~ ') ? line : `~ ${line}`)
      .join('\n');
  };

  // Handle special Enter key behavior for notes
  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, isEditing = false) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const content = textarea.value;
      const beforeCursor = content.substring(0, cursorPos);
      const afterCursor = content.substring(cursorPos);
      
      // Add new line with ~ bullet
      const newContent = beforeCursor + '\n~ ' + afterCursor;
      
      if (isEditing && editingNote) {
        setEditingNote({ ...editingNote, content: newContent });
      } else {
        setNewNote({ ...newNote, content: newContent });
      }
      
      // Set cursor position after the ~ 
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursorPos + 3;
        textarea.focus();
      }, 0);
    }
  };

  // Handle content change to ensure ~ bullets
  const handleContentChange = (value: string, isEditing = false) => {
    // If content is empty and user starts typing, add initial ~
    let processedValue = value;
    if (!value.trim()) {
      processedValue = "";
    } else if (value.length === 1 && !value.startsWith('~')) {
      processedValue = `~ ${value}`;
    }
    
    if (isEditing && editingNote) {
      setEditingNote({ ...editingNote, content: processedValue });
    } else {
      setNewNote({ ...newNote, content: processedValue });
    }
  };

  // Initialize new note content when component mounts or when creating new note
  useEffect(() => {
    if (!newNote.content && !editingNote) {
      setNewNote({ ...newNote, content: "~ " });
    }
  }, [editingNote]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={goBack} size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Document
              </Button>
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-bold text-neutral-800">Notes</h1>
              </div>
            </div>
            <div className="text-sm text-neutral-600">
              {document?.filename}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create New Note */}
          <div className="bg-white rounded-lg shadow-lg border border-neutral-200">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-800 flex items-center">
                <Plus className="w-5 h-5 mr-2 text-green-600" />
                {editingNote ? "Edit Note" : "Create New Note"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <Input
                placeholder="Note title..."
                value={editingNote ? editingNote.title : newNote.title}
                onChange={(e) => 
                  editingNote 
                    ? setEditingNote({ ...editingNote, title: e.target.value })
                    : setNewNote({ ...newNote, title: e.target.value })
                }
                className="border-neutral-300 focus:border-blue-500"
              />
              <Textarea
                placeholder="~ Start typing your notes here... Press Enter to create a new sentence with ~"
                value={editingNote ? editingNote.content : newNote.content}
                onChange={(e) => handleContentChange(e.target.value, !!editingNote)}
                onKeyDown={(e) => handleNoteKeyDown(e, !!editingNote)}
                rows={12}
                className="border-neutral-300 focus:border-blue-500 font-mono text-sm"
              />
              <div className="flex space-x-3">
                <Button 
                  onClick={editingNote ? handleUpdateNote : handleCreateNote}
                  disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingNote ? "Update Note" : "Save Note"}
                </Button>
                {editingNote && (
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingNote(null)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Notes List */}
          <div className="bg-white rounded-lg shadow-lg border border-neutral-200">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-800">
                Your Notes ({notes.length})
              </h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-8 text-neutral-500">
                  Loading notes...
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-500">No notes yet</p>
                  <p className="text-sm text-neutral-400">Create your first note to get started</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {notes.map((note: Note) => (
                    <div key={note.id} className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-neutral-800">{note.title}</h3>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingNote(note)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600 mb-2 line-clamp-3">
                        {note.content}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {new Date(note.createdAt).toLocaleDateString()} • {new Date(note.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}