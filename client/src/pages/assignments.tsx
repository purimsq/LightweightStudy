import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, Edit, X, Award, Clock, CheckCircle, AlertCircle, Upload, Calendar } from "lucide-react";
import type { Assignment, Unit } from "@shared/schema";
import PDFViewer from "@/components/viewers/pdf-viewer";
import DOCXViewer from "@/components/viewers/docx-viewer";
import EditableDocument from "@/components/viewers/editable-document";

export default function AssignmentsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["/api/assignments"],
    queryFn: () => apiRequest("GET", "/api/assignments").then(res => res.json())
  });

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
    queryFn: () => apiRequest("GET", "/api/units").then(res => res.json())
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-600 mt-2">Track and manage your assignments</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Assignment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.map((assignment: Assignment) => (
          <AssignmentCard key={assignment.id} assignment={assignment} />
        ))}
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
          <p className="text-gray-600 mb-6">Create your first assignment to get started</p>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Assignment
          </Button>
        </div>
      )}

      <CreateAssignmentDialog 
        isOpen={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        units={units}
      />
    </div>
  );
}

function CreateAssignmentDialog({ isOpen, onOpenChange, units }: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void;
  units: Unit[];
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("assignment");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [unitId, setUnitId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // If file is attached, use upload endpoint
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Package assignment data as JSON string
        const assignmentData = {
          title: data.title,
          type: data.type,
          description: data.description,
          unitId: data.unitId,
          deadline: data.deadline ? data.deadline.toISOString() : new Date().toISOString(),
          totalMarks: data.totalMarks
        };
        formData.append('assignmentData', JSON.stringify(assignmentData));
        
        const response = await fetch('/api/assignments/upload', {
          method: 'POST',
          body: formData,
        });
        return response.json();
      } else {
        // Regular assignment creation
        const response = await apiRequest("POST", "/api/assignments", data);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      onOpenChange(false);
      setTitle("");
      setType("assignment");
      setDescription("");
      setDueDate("");
      setTotalMarks("");
      setUnitId("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: "Assignment created successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating assignment", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    createMutation.mutate({
      title: title.trim(),
      type: type,
      description: description.trim(),
      deadline: dueDate ? new Date(dueDate) : new Date(),
      totalMarks: totalMarks ? parseInt(totalMarks) : undefined,
      unitId: unitId ? parseInt(unitId) : undefined
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title and Type side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Assignment title..."
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="cat">CAT</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Units and Marks side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit">Unit (optional)</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a unit..." />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="totalMarks">Total Marks (optional)</Label>
              <Input
                id="totalMarks"
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                placeholder="e.g. 100"
                min="0"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Assignment description..."
              rows={4}
            />
          </div>

          {/* File upload */}
          <div>
            <Label htmlFor="file">Choose File (optional)</Label>
            <Input
              id="file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-sm text-gray-500 mt-1">PDF or DOCX files only</p>
          </div>

          {/* Deadline */}
          <div>
            <Label htmlFor="dueDate">Deadline (optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



function AssignmentEditor({ assignment, isOpen, onOpenChange }: { 
  assignment: Assignment; 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [editedContent, setEditedContent] = useState(assignment.description || "");
  const [isEditing, setIsEditing] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/assignments/${assignment.id}`, {
        description: editedContent
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      setIsEditing(false);
      toast({ title: "Assignment updated successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating assignment", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const startEditing = () => {
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedContent(assignment.description || "");
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>{assignment.title}</span>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEditing}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Document
                </Button>
              )}
              {isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditing}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            View and edit assignment content with attached documents
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto p-6" style={{ maxHeight: 'calc(95vh - 200px)' }}>
          <div className={`h-full bg-white rounded-lg overflow-hidden border ${isEditing ? 'bg-yellow-50 border-yellow-200' : ''}`}>
            <div className="w-full h-full p-6 overflow-auto">
              <div className="max-w-4xl mx-auto">
                {isEditing && (
                  <div className="mb-4 px-3 py-2 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm rounded-lg">
                    ✏️ Edit Mode Active - Click anywhere in the content below to start editing
                  </div>
                )}
                
                <div className="w-full">
                  {assignment?.attachedFilePath ? (
                    (() => {
                      const fileExtension = assignment.attachedFilePath.toLowerCase().split('.').pop();
                      
                      if (fileExtension === 'pdf') {
                        return (
                          <div className="w-full h-full">
                            <PDFViewer 
                              fileUrl={assignment.attachedFilePath} 
                              filename={assignment.title}
                              documentId={assignment.id.toString()}
                              unitId={assignment.unitId}
                              isEditing={isEditing}
                              onContentChange={setEditedContent}
                            />
                          </div>
                        );
                      } else if (fileExtension === 'docx') {
                        return (
                          <div className="w-full h-full">
                            <DOCXViewer 
                              fileUrl={assignment.attachedFilePath} 
                              filename={assignment.title}
                              documentId={assignment.id.toString()}
                              unitId={assignment.unitId}
                              isEditing={isEditing}
                              onContentChange={setEditedContent}
                            />
                          </div>
                        );
                      }
                      
                      // Fallback for other content
                      return (
                        <div 
                          ref={editableRef}
                          className={`document-content prose prose-sm max-w-none min-h-96 p-6 rounded-lg border transition-all duration-200 ${
                            isEditing 
                              ? 'bg-yellow-50 border-yellow-300 cursor-text focus:outline-none focus:ring-2 focus:ring-yellow-400 editing-mode' 
                              : 'bg-white border-gray-200 cursor-pointer hover:bg-gray-50'
                          }`}
                          contentEditable={isEditing}
                          onClick={() => !isEditing && startEditing()}
                          onInput={(e) => setEditedContent(e.currentTarget.innerHTML)}
                          suppressContentEditableWarning={true}
                          dangerouslySetInnerHTML={{ 
                            __html: editedContent || "<p>Click to add content...</p>"
                          }}
                        />
                      );
                    })()
                  ) : (
                    <div className="text-center py-8 text-gray-500">No document attached</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      const response = await apiRequest("DELETE", `/api/assignments/${assignmentId}`);
      if (!response.ok) throw new Error("Failed to delete assignment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      setShowDeleteDialog(false);
      toast({ title: "Assignment deleted successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting assignment", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "in_progress":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const handleDeleteConfirm = () => {
    deleteAssignmentMutation.mutate(assignment.id);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
              {getStatusIcon(assignment.status)}
              <span className="ml-1 capitalize">{assignment.status?.replace('_', ' ')}</span>
            </div>
            {assignment.attachedFilePath && (
              <FileText className="w-4 h-4 text-blue-600" />
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 cursor-pointer hover:text-blue-600" 
              onClick={() => setShowEditor(true)}>
            {assignment.title}
          </h3>
          {assignment.description && (
            <p className="text-gray-600 text-sm line-clamp-3">
              {assignment.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
            </p>
          )}
        </div>

        {assignment.deadline && (
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <Calendar className="w-4 h-4 mr-2" />
            Due: {new Date(assignment.deadline).toLocaleDateString()}
          </div>
        )}

        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowEditor(true)}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Assignment</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete "{assignment.title}"? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleteAssignmentMutation.isPending}
            >
              {deleteAssignmentMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignmentEditor 
        assignment={assignment}
        isOpen={showEditor}
        onOpenChange={setShowEditor}
      />
    </>
  );
}