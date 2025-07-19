import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Save, FileText, Plus, Edit3, Trash2, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
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
  const [isNotesOpen, setIsNotesOpen] = useState(false);
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
      setNewNote({ title: "", content: "" });
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
    const cleanedContent = cleanContent(newNote.content);
    if (!newNote.title.trim() || !cleanedContent) {
      toast({ title: "Please fill in both title and content", variant: "destructive" });
      return;
    }
    createNoteMutation.mutate({ 
      title: newNote.title.toUpperCase(), 
      content: cleanedContent 
    });
  };

  const handleUpdateNote = () => {
    if (!editingNote) return;
    const cleanedContent = cleanContent(editingNote.content || '');
    if (!editingNote.title?.trim() || !cleanedContent) {
      toast({ title: "Please fill in both title and content", variant: "destructive" });
      return;
    }
    updateNoteMutation.mutate({ 
      ...editingNote, 
      title: editingNote.title.toUpperCase(),
      content: cleanedContent 
    });
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
    // Only add ~ when user starts typing (not on empty)
    let processedValue = value;
    if (value && value.length === 1 && !value.startsWith('~')) {
      processedValue = `~ ${value}`;
    }
    
    if (isEditing && editingNote) {
      setEditingNote({ ...editingNote, content: processedValue });
    } else {
      setNewNote({ ...newNote, content: processedValue });
    }
  };

  // Clean up content before saving - remove empty ~ lines
  const cleanContent = (content: string) => {
    return content
      .split('\n')
      .filter(line => line.trim() !== '~')
      .join('\n')
      .trim();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={goBack} size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Document
              </Button>
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <h1 className="text-xl font-bold text-neutral-800">My Notebook</h1>
              </div>
            </div>
            <div className="text-sm text-neutral-600">
              {document?.filename}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Side - Notebook Writing Area */}
          <div className="lg:col-span-3">
            <div className="bg-white shadow-xl rounded-lg border-2 border-amber-200 relative overflow-hidden">
              {/* Red Margin Line */}
              <div className="absolute left-14 top-0 bottom-0 w-0.5 bg-red-400 opacity-60"></div>
              
              {/* Spiral Holes */}
              <div className="absolute left-3 top-6 space-y-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 bg-gray-100 border border-gray-300 rounded-full shadow-inner"></div>
                ))}
              </div>

              <div className="pl-16 pr-6 py-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 mb-4">
                    <BookOpen className="w-5 h-5 text-amber-600" />
                    <h2 className="text-lg font-semibold text-neutral-800">
                      {editingNote ? "Edit Note" : "Write in Your Notebook"}
                    </h2>
                  </div>
                  
                  <Input
                    placeholder="Note title..."
                    value={editingNote ? editingNote.title || '' : newNote.title}
                    onChange={(e) => 
                      editingNote 
                        ? setEditingNote({ ...editingNote, title: e.target.value })
                        : setNewNote({ ...newNote, title: e.target.value })
                    }
                    className="text-base font-medium border-none shadow-none focus:ring-0 bg-transparent border-b-2 border-amber-200 focus:border-amber-400 rounded-none pb-2 uppercase"
                  />
                  
                  {/* Notebook Lines Background */}
                  <div className="relative">
                    <div 
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          transparent,
                          transparent 27px,
                          #cbd5e0 27px,
                          #cbd5e0 28px
                        )`
                      }}
                    ></div>
                    
                    <Textarea
                      placeholder="Start writing your notes here... Press Enter to create a new sentence with ~"
                      value={editingNote ? editingNote.content || '' : newNote.content}
                      onChange={(e) => handleContentChange(e.target.value, !!editingNote)}
                      onKeyDown={(e) => handleNoteKeyDown(e, !!editingNote)}
                      rows={14}
                      className="relative z-10 border-none shadow-none focus:ring-0 bg-transparent text-base leading-7 resize-none notebook-textarea"
                      style={{ 
                        lineHeight: '28px'
                      }}
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-3">
                    <Button 
                      onClick={editingNote ? handleUpdateNote : handleCreateNote}
                      disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
                      className="bg-amber-600 hover:bg-amber-700"
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
            </div>
          </div>

          {/* Right Side - Saved Notes */}
          <div className="lg:col-span-1">
            <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-between h-10 text-left bg-white shadow-sm border-amber-200"
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium">Saved Notes ({notes.length})</span>
                  </div>
                  {isNotesOpen ? (
                    <ChevronDown className="w-3 h-3 text-amber-600" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-amber-600" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-3">
                <div className="bg-white rounded-lg shadow-sm border border-amber-200 p-4">
                  {isLoading ? (
                    <div className="text-center py-4 text-neutral-500 text-sm">
                      Loading...
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      <p className="text-neutral-500 text-sm">No saved notes</p>
                      <p className="text-xs text-neutral-400">Start writing to save notes</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {notes.map((note: Note) => (
                        <div key={note.id} className="border border-amber-100 rounded-md p-3 hover:bg-amber-50 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-neutral-800 text-sm flex items-center uppercase">
                              <BookOpen className="w-3 h-3 mr-1 text-amber-600" />
                              {note.title}
                            </h4>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingNote(note)}
                                className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNote(note.id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-neutral-600 line-clamp-2 whitespace-pre-line">
                            {note.content}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  );
}