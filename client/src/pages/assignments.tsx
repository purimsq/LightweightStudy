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
import { FileText, Plus, Trash2, Edit, X, Award, Clock, CheckCircle, AlertCircle, Upload, Calendar, Star, BookOpen } from "lucide-react";
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
          <AssignmentCard key={assignment.id} assignment={assignment} units={units} />
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
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assignmentId', assignment.id.toString());

      const response = await fetch('/api/assignments/add-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      return response.json();
    },
    onSuccess: (updatedAssignment) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      setSelectedFile(null);
      setShowFileUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ 
        title: "Document attached successfully!", 
        description: `Added ${updatedAssignment.attachedFileName} to assignment`
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error attaching document", 
        description: error instanceof Error ? error.message : "Unknown error occurred",
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = () => {
    if (selectedFile) {
      uploadFileMutation.mutate(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>{assignment.title}</span>
              
              {/* File Upload Section */}
              {!assignment.attachedFilePath ? (
                <div className="flex items-center space-x-2">
                  {!showFileUpload ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFileUpload(true)}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Add Document
                    </Button>
                  ) : (
                    <div className="flex items-center space-x-2 bg-green-50 p-2 rounded-lg border border-green-200">
                      <div className="flex flex-col space-y-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.doc"
                          onChange={handleFileSelect}
                          className="text-sm"
                        />
                        {selectedFile && (
                          <span className="text-xs text-gray-600">
                            Selected: {selectedFile.name}
                          </span>
                        )}
                      </div>
                      {selectedFile && (
                        <>
                          <Button
                            size="sm"
                            onClick={handleFileUpload}
                            disabled={uploadFileMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {uploadFileMutation.isPending ? "Uploading..." : "Upload"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveFile}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowFileUpload(false);
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm">
                    <FileText className="w-3 h-3" />
                    <span>Document attached</span>
                  </div>
                  {!showFileUpload ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFileUpload(true)}
                      className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Replace Document
                    </Button>
                  ) : (
                    <div className="flex items-center space-x-2 bg-orange-50 p-2 rounded-lg border border-orange-200">
                      <div className="flex flex-col space-y-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.doc"
                          onChange={handleFileSelect}
                          className="text-sm"
                        />
                        {selectedFile && (
                          <span className="text-xs text-gray-600">
                            Selected: {selectedFile.name}
                          </span>
                        )}
                      </div>
                      {selectedFile && (
                        <>
                          <Button
                            size="sm"
                            onClick={handleFileUpload}
                            disabled={uploadFileMutation.isPending}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            {uploadFileMutation.isPending ? "Replacing..." : "Replace"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveFile}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowFileUpload(false);
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Edit Document Button */}
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
              
              {/* Edit Mode Buttons */}
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
              
              {/* Close Button */}
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
            {!assignment.attachedFilePath && (
              <span className="block mt-1 text-orange-600">
                ⚠️ No document attached. Click "Add Document" to attach a file.
              </span>
            )}
            {assignment.attachedFilePath && (
              <span className="block mt-1 text-green-600">
                ✅ Document attached: {assignment.attachedFileName || "Unknown file"}
              </span>
            )}
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

function AssignmentCard({ assignment, units }: { assignment: Assignment; units: Unit[] }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showMarksDialog, setShowMarksDialog] = useState(false);
  const [userGrade, setUserGrade] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
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

  const toggleCompletionMutation = useMutation({
    mutationFn: async ({ assignmentId, userGrade, totalMarks }: { assignmentId: number; userGrade?: string; totalMarks?: string }) => {
      const response = await fetch(`/api/assignments/${assignmentId}/toggle-completion`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userGrade, totalMarks }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (updatedAssignment) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/unit-progress"] });
      setShowMarksDialog(false);
      setUserGrade("");
      setTotalMarks("");
      
      const isCompleted = updatedAssignment.status === "completed";
      toast({ 
        title: isCompleted ? "Assignment marked as complete" : "Assignment marked as incomplete",
        description: isCompleted && updatedAssignment.userGrade ? 
          `Grade: ${updatedAssignment.userGrade}/${updatedAssignment.totalMarks}` : 
          `Updated ${updatedAssignment.title}`
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating assignment completion", 
        description: error instanceof Error ? error.message : "Unknown error occurred",
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

  const handleToggleCompletion = () => {
    if (assignment.status === "completed") {
      // If already completed, just toggle to incomplete
      toggleCompletionMutation.mutate({ assignmentId: assignment.id });
    } else {
      // If not completed, show marks dialog
      setShowMarksDialog(true);
      // Pre-fill total marks if available
      if (assignment.totalMarks) {
        setTotalMarks(assignment.totalMarks.toString());
      }
    }
  };

  const handleSubmitMarks = () => {
    if (!userGrade) {
      toast({ 
        title: "Missing information", 
        description: "Please enter your grade",
        variant: "destructive" 
      });
      return;
    }

    const grade = parseInt(userGrade);
    const total = assignment.totalMarks || parseInt(totalMarks);
    
    if (isNaN(grade) || grade < 0) {
      toast({ 
        title: "Invalid grade", 
        description: "Please enter a valid grade (0 or higher)",
        variant: "destructive" 
      });
      return;
    }

    if (assignment.totalMarks && grade > assignment.totalMarks) {
      toast({ 
        title: "Invalid grade", 
        description: `Grade cannot exceed ${assignment.totalMarks} marks`,
        variant: "destructive" 
      });
      return;
    }

    if (!assignment.totalMarks && (!totalMarks || isNaN(total) || total <= 0 || grade > total)) {
      toast({ 
        title: "Invalid marks", 
        description: "Please enter valid marks (grade must be between 0 and total marks)",
        variant: "destructive" 
      });
      return;
    }

    toggleCompletionMutation.mutate({ 
      assignmentId: assignment.id, 
      userGrade, 
      totalMarks: assignment.totalMarks ? undefined : totalMarks 
    });
  };

  return (
    <>
      <div className={`bg-white border rounded-xl p-6 hover:shadow-lg transition-all duration-300 ${
        assignment.status === "completed" 
          ? "border-green-200 bg-gradient-to-br from-green-50 to-white" 
          : assignment.status === "in_progress"
          ? "border-blue-200 bg-gradient-to-br from-blue-50 to-white"
          : "border-gray-200 hover:border-gray-300"
      }`}>
        {/* Header with status and actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {/* Status Badge */}
            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium shadow-sm ${getStatusColor(assignment.status)}`}>
              {getStatusIcon(assignment.status)}
              <span className="ml-2 capitalize">{assignment.status?.replace('_', ' ')}</span>
            </div>
            
            {/* Type Badge */}
            <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
              {assignment.type?.toUpperCase()}
            </div>
            
            {/* File Attachment Indicator */}
            {assignment.attachedFilePath && (
              <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                <FileText className="w-3 h-3 mr-1" />
                File
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant={assignment.status === "completed" ? "default" : "outline"}
              size="sm"
              onClick={handleToggleCompletion}
              className={`px-3 transition-all duration-200 ${
                assignment.status === "completed" 
                  ? 'bg-green-500 hover:bg-green-600 border-green-500 shadow-md' 
                  : 'border-green-300 hover:border-green-400 hover:bg-green-50'
              }`}
              title={assignment.status === "completed" ? "Mark as incomplete" : "Mark as complete"}
              disabled={toggleCompletionMutation.isPending}
            >
              <CheckCircle className={`w-4 h-4 ${assignment.status === "completed" ? 'text-white' : 'text-green-500'}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Title and Description */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-3 cursor-pointer hover:text-blue-600 transition-colors" 
              onClick={() => setShowEditor(true)}>
            {assignment.title}
          </h3>
          {assignment.description && (
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
              {assignment.description.replace(/<[^>]*>/g, '').substring(0, 200)}
              {assignment.description.length > 200 && "..."}
            </p>
          )}
        </div>

        {/* Assignment Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Deadline */}
          {assignment.deadline && (
            <div className="flex items-center text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              <div>
                <div className="font-medium">Due Date</div>
                <div className="text-gray-500">{new Date(assignment.deadline).toLocaleDateString()}</div>
                {(() => {
                  const daysRemaining = Math.ceil((new Date(assignment.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  if (daysRemaining < 0) {
                    return <div className="text-red-500 text-xs font-medium">Overdue by {Math.abs(daysRemaining)} days</div>;
                  } else if (daysRemaining === 0) {
                    return <div className="text-orange-500 text-xs font-medium">Due today!</div>;
                  } else if (daysRemaining <= 3) {
                    return <div className="text-orange-500 text-xs font-medium">{daysRemaining} days remaining</div>;
                  } else {
                    return <div className="text-gray-400 text-xs">{daysRemaining} days remaining</div>;
                  }
                })()}
              </div>
            </div>
          )}
          
          {/* Total Marks */}
          {assignment.totalMarks && (
            <div className="flex items-center text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <Award className="w-4 h-4 mr-2 text-gray-500" />
              <div>
                <div className="font-medium">Total Marks</div>
                <div className="text-gray-500">{assignment.totalMarks}</div>
              </div>
            </div>
          )}
        </div>

        {/* Grade Display (if completed) */}
        {assignment.status === "completed" && assignment.userGrade && assignment.totalMarks && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Grade Achieved</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {assignment.userGrade}/{assignment.totalMarks}
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(assignment.userGrade / assignment.totalMarks) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-green-600 mt-1">
                {Math.round((assignment.userGrade / assignment.totalMarks) * 100)}% Score
              </div>
            </div>
          </div>
        )}

        {/* Unit Information */}
        {assignment.unitId && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-sm text-blue-700">
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="font-medium">Unit:</span>
              <span className="ml-1">{units.find(u => u.id === assignment.unitId)?.name || 'Unknown Unit'}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowEditor(true)}
            className="flex-1 hover:bg-blue-50 hover:border-blue-300"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Assignment
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

      {/* Marks Input Dialog */}
      <Dialog open={showMarksDialog} onOpenChange={setShowMarksDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Assignment</DialogTitle>
            <DialogDescription>
              Enter your marks for "{assignment.title}" to mark it as complete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {assignment.totalMarks && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-blue-700">
                  <Award className="w-4 h-4" />
                  <span className="font-medium">Total Marks: {assignment.totalMarks}</span>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="userGrade">Your Grade</Label>
              <Input
                id="userGrade"
                type="number"
                placeholder={assignment.totalMarks ? `e.g., 0-${assignment.totalMarks}` : "e.g., 85"}
                value={userGrade}
                onChange={(e) => setUserGrade(e.target.value)}
                min="0"
                max={assignment.totalMarks || undefined}
                className="text-lg font-medium"
              />
              {assignment.totalMarks && (
                <p className="text-xs text-gray-500">
                  Enter your grade out of {assignment.totalMarks} marks
                </p>
              )}
            </div>
            
            {!assignment.totalMarks && (
              <div className="space-y-2">
                <Label htmlFor="totalMarks">Total Marks</Label>
                <Input
                  id="totalMarks"
                  type="number"
                  placeholder="e.g., 100"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  min="1"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarksDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitMarks}
              disabled={toggleCompletionMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {toggleCompletionMutation.isPending ? "Completing..." : "Complete Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}