import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Save, FileText, Edit3, Trash2, ChevronDown, ChevronRight, BookOpen, AlertTriangle } from "lucide-react";
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

function DeleteConfirmDialog({ 
  isOpen, 
  onOpenChange, 
  onConfirm, 
  title, 
  description,
  itemName,
  isDeleting 
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName: string;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <DialogTitle className="text-red-600">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description}
            <br />
            <span className="font-semibold text-neutral-800">"{itemName}"</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function NotesPage({ documentId }: NotesPageProps) {
  const [location, setLocation] = useLocation();
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [deleteDialogNote, setDeleteDialogNote] = useState<Note | null>(null);
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
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/documents/${documentId}/notes`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(noteData),
      });
      if (!response.ok) throw new Error("Failed to create note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/notes`] });
      setNewNote({ title: "", content: "" });
      toast({ title: "Note saved successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to save note", variant: "destructive" });
    }
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async (noteData: Note) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/notes/${noteData.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(noteData),
      });
      if (!response.ok) throw new Error("Failed to update note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/notes`] });
      setEditingNote(null);
      toast({ title: "Note updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update note", variant: "destructive" });
    }
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/notes/${noteId}`, { 
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/notes`] });
      toast({ title: "Note deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete note", variant: "destructive" });
    }
  });

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

  const handleDeleteNote = (note: Note) => {
    setDeleteDialogNote(note);
  };

  // Clean up content before saving - remove empty • lines
  const cleanContent = (content: string) => {
    return content
      .split('\n')
      .filter(line => line.trim() !== '•')
      .join('\n')
      .trim();
  };

  // Handle content change to ensure • bullets
  const handleContentChange = (value: string, isEditing = false) => {
    let processedValue = value;
    
    // Only add • when user starts typing (not on empty)
    if (value && value.length === 1 && !value.startsWith('•') && !value.startsWith('#')) {
      processedValue = `• ${value}`;
    }
    
    if (isEditing && editingNote) {
      setEditingNote({ ...editingNote, content: processedValue });
    } else {
      setNewNote({ ...newNote, content: processedValue });
    }
  };

  // Handle Enter key for bullet points
  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, isEditing = false) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const content = textarea.value;
      const beforeCursor = content.substring(0, cursorPos);
      const afterCursor = content.substring(cursorPos);
      
      // Check if current line is a header or subheader
      const lines = beforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      
      let newLineContent = '\n• ';
      
      // For headers and subheaders, don't add bullet on next line
      if (currentLine.startsWith('## ') || currentLine.startsWith('### ')) {
        newLineContent = '\n';
      }
      
      const newContent = beforeCursor + newLineContent + afterCursor;
      
      if (isEditing && editingNote) {
        setEditingNote({ ...editingNote, content: newContent });
      } else {
        setNewNote({ ...newNote, content: newContent });
      }
      
      // Set cursor position after the new content
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = beforeCursor.length + newLineContent.length;
        textarea.focus();
      }, 0);
    }
  };

  // Render content with styled headers and bullets
  const renderStyledContent = (content: string) => {
    if (!content) return null;
    
    return content.split('\n').map((line, index) => {
      const key = `line-${index}`;
      
      if (line.startsWith('## ')) {
        return (
          <div key={key} className="text-blue-600 font-bold text-base my-1 leading-tight">
            {line.substring(3).trim()}
          </div>
        );
      } else if (line.startsWith('### ')) {
        return (
          <div key={key} className="text-indigo-600 font-semibold text-sm my-1 leading-tight">
            {line.substring(4).trim()}
          </div>
        );
      } else if (line.startsWith('• ')) {
        return (
          <div key={key} className="flex items-start my-0.5">
            <span className="font-bold text-gray-700 mr-1 text-xs">•</span>
            <span className="flex-1 text-xs">{line.substring(2)}</span>
          </div>
        );
      } else if (line.trim()) {
        return (
          <div key={key} className="my-0.5 text-xs">
            {line}
          </div>
        );
      }
      
      return <div key={key} className="my-0.5" />; // Empty line
    });
  };

  const goBack = () => {
    setLocation(`/documents/${documentId}`);
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
                      placeholder="Start writing... Press Enter for new bullet • Use ## for headers and ### for subheaders"
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
                                onClick={() => handleDeleteNote(note)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-neutral-600 line-clamp-2 overflow-hidden">
                            {renderStyledContent(note.content)}
                          </div>
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
      
      <DeleteConfirmDialog
        isOpen={deleteDialogNote !== null}
        onOpenChange={(open) => !open && setDeleteDialogNote(null)}
        onConfirm={() => {
          if (deleteDialogNote) {
            deleteNoteMutation.mutate(deleteDialogNote.id);
            setDeleteDialogNote(null);
          }
        }}
        title="Delete Note"
        description="This will permanently delete this note. This action cannot be undone."
        itemName={deleteDialogNote?.title || ""}
        isDeleting={deleteNoteMutation.isPending}
      />
    </div>
  );
}