import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Calendar, CheckCircle, Clock, AlertCircle, FileText, Trash2, AlertTriangle, Upload, Download, Edit, GraduationCap, FileUp, Award, X, Eye, Save, ChevronUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Assignment, Unit } from "@shared/schema";
import { format } from "date-fns";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import { useLocation } from "wouter";
import React from "react";
import PDFViewer from "@/components/viewers/pdf-viewer";
import DOCXViewer from "@/components/viewers/docx-viewer";
import EditableDocument from "@/components/viewers/editable-document";

function CreateAssignmentDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "assignment",
    deadline: "",
    status: "pending",
    unitId: "",
    totalMarks: "",
  });
  const { toast } = useToast();

  // Get units for dropdown
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: any) => {
      // If file is attached, upload it first
      if (selectedFile) {
        const formDataWithFile = new FormData();
        formDataWithFile.append('file', selectedFile);
        formDataWithFile.append('assignmentData', JSON.stringify(data));
        
        const response = await fetch('/api/assignments/upload', {
          method: 'POST',
          body: formDataWithFile,
        });
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/assignments", data);
        return response.json();
      }
    },
    onSuccess: () => {
      // Invalidate all assignment-related queries including dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      setIsOpen(false);
      setFormData({
        title: "",
        description: "",
        type: "assignment", 
        deadline: "",
        status: "pending",
        unitId: "",
        totalMarks: "",
      });
      setSelectedFile(null);
      toast({ title: "Assignment created successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating assignment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.deadline) {
      toast({ 
        title: "Error", 
        description: "Please fill in all required fields",
        variant: "destructive" 
      });
      return;
    }
    
    const submitData = {
      title: formData.title,
      description: formData.description,
      type: formData.type as "assignment" | "cat" | "exam",
      deadline: new Date(formData.deadline),
      status: formData.status as "pending" | "in_progress" | "completed",
      unitId: formData.unitId ? parseInt(formData.unitId) : null,
      totalMarks: formData.totalMarks ? parseInt(formData.totalMarks) : null,
    };
    
    createAssignmentMutation.mutate(submitData);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.type.includes('document')) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF or DOCX file",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
          <DialogDescription>
            Create a new assignment, quiz, CAT, or exam with optional file attachment
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Assignment title"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">📝 Assignment</SelectItem>
                  <SelectItem value="cat">📊 CAT</SelectItem>
                  <SelectItem value="exam">🎓 Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Unit</label>
              <Select 
                value={formData.unitId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, unitId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Total Marks</label>
              <Input
                type="number"
                value={formData.totalMarks}
                onChange={(e) => setFormData(prev => ({ ...prev, totalMarks: e.target.value }))}
                placeholder="100"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Assignment description and instructions"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Deadline *</label>
            <Input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              required
            />
          </div>

          {/* File Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div className="text-center">
              <FileUp className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <div className="text-sm text-gray-600 mb-2">
                Attach PDF or DOCX file (optional)
              </div>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                  input.onchange = (e) => handleFileSelect(e as React.ChangeEvent<HTMLInputElement>);
                  input.click();
                }}
                className="cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
              {selectedFile && (
                <div className="mt-2 p-2 bg-blue-50 rounded flex items-center justify-between">
                  <span className="text-sm text-blue-700">{selectedFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createAssignmentMutation.isPending}>
              {createAssignmentMutation.isPending ? "Creating..." : "Create Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Grade Input Dialog Component
function GradeInputDialog({ 
  assignment, 
  isOpen, 
  onOpenChange 
}: { 
  assignment: Assignment | null; 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const [grade, setGrade] = useState("");
  const { toast } = useToast();

  const updateGradeMutation = useMutation({
    mutationFn: async (data: { grade: number, assignmentId: number }) => {
      const response = await apiRequest("PATCH", `/api/assignments/${data.assignmentId}/grade`, {
        userGrade: data.grade,
        status: "completed"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      onOpenChange(false);
      setGrade("");
      toast({ title: "Grade submitted successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error submitting grade", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment || !grade) return;
    
    const gradeNum = parseInt(grade);
    if (gradeNum < 0 || (assignment.totalMarks && gradeNum > assignment.totalMarks)) {
      toast({
        title: "Invalid grade",
        description: `Grade must be between 0 and ${assignment.totalMarks || 100}`,
        variant: "destructive"
      });
      return;
    }
    
    updateGradeMutation.mutate({ grade: gradeNum, assignmentId: assignment.id });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Grade</DialogTitle>
          <DialogDescription>
            Enter your grade for "{assignment?.title}"
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Your Grade (out of {assignment?.totalMarks || 100})
            </label>
            <Input
              type="number"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Enter your grade"
              min="0"
              max={assignment?.totalMarks || 100}
              required
            />
          </div>
          
          {assignment?.totalMarks && (
            <div className="text-sm text-gray-600">
              Percentage: {grade ? Math.round((parseInt(grade) / assignment.totalMarks) * 100) : 0}%
            </div>
          )}
          
          <DialogFooter>
            <Button type="submit" disabled={updateGradeMutation.isPending}>
              {updateGradeMutation.isPending ? "Submitting..." : "Submit Grade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Simple Assignment Document Editor Component
function AssignmentEditor({ 
  assignment, 
  isOpen, 
  onOpenChange 
}: { 
  assignment: Assignment | null; 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const { toast } = useToast();

  // Initialize content when assignment changes
  useEffect(() => {
    if (assignment?.content) {
      setEditedContent(assignment.content);
    }
  }, [assignment?.content]);

  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/assignments/${assignment!.id}`, {
        method: "PATCH",
        body: { content },
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document saved successfully!",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save document: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(editedContent);
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedContent(assignment?.content || "");
  };

  const handleDownload = () => {
    const blob = new Blob([editedContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assignment.title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!assignment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="text-xl font-semibold">{assignment.title}</span>
                <p className="text-sm text-gray-500 mt-1">
                  {assignment?.type?.toUpperCase()} • Click to edit content
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditing}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Document
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </>
              ) : (
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
            {assignment.description}
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
                
                <div 
                  className={`prose max-w-none min-h-96 p-6 rounded-lg border transition-all duration-200 ${
                    isEditing 
                      ? 'bg-yellow-50 border-yellow-300 cursor-text focus:outline-none focus:ring-2 focus:ring-yellow-400' 
                      : 'bg-white border-gray-200 cursor-pointer hover:bg-gray-50'
                  }`}
                  contentEditable={isEditing}
                  onClick={() => !isEditing && startEditing()}
                  onInput={(e) => setEditedContent(e.currentTarget.innerHTML)}
                  onBlur={(e) => setEditedContent(e.currentTarget.innerHTML)}
                  dangerouslySetInnerHTML={{ 
                    __html: editedContent || assignment.content || assignment.description || "<p>Click here to start editing this assignment...</p>" 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Confirmation Dialog Component
function ConfirmDeleteDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isDeleting,
  itemName,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  itemName: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>Confirm Deletion</span>
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete:
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

function GradeDialog({ 
  assignment, 
  isOpen, 
  onOpenChange 
}: { 
  assignment: Assignment | null; 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const [grade, setGrade] = useState("");
  const { toast } = useToast();

  const updateGradeMutation = useMutation({
    mutationFn: async (data: { grade: number, assignmentId: number }) => {
      const response = await apiRequest("PATCH", `/api/assignments/${data.assignmentId}/grade`, {
        userGrade: data.grade,
        status: "completed"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      onOpenChange(false);
      setGrade("");
      toast({ title: "Grade submitted successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error submitting grade", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment || !grade) return;
    
    const gradeNum = parseInt(grade);
    if (gradeNum < 0 || (assignment.totalMarks && gradeNum > assignment.totalMarks)) {
      toast({
        title: "Invalid grade",
        description: `Grade must be between 0 and ${assignment.totalMarks || 100}`,
        variant: "destructive"
      });
      return;
    }
    
    updateGradeMutation.mutate({ grade: gradeNum, assignmentId: assignment.id });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Grade</DialogTitle>
          <DialogDescription>
            Enter your grade for "{assignment?.title}"
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Your Grade (out of {assignment?.totalMarks || 100})
            </label>
            <Input
              type="number"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Enter your grade"
              min="0"
              max={assignment?.totalMarks || 100}
              required
            />
          </div>
          
          {assignment?.totalMarks && (
            <div className="text-sm text-gray-600">
              Percentage: {grade ? Math.round((parseInt(grade) / assignment.totalMarks) * 100) : 0}%
            </div>
          )}
          
          <DialogFooter>
            <Button type="submit" disabled={updateGradeMutation.isPending}>
              {updateGradeMutation.isPending ? "Submitting..." : "Submit Grade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Confirmation Dialog Component - Fixed duplicate removal
function ConfirmDeleteDialogFixed({
  isOpen,
  onOpenChange,
  onConfirm,
  isDeleting,
  itemName,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  itemName: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>Confirm Deletion</span>
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete:
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

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();
  
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PATCH", `/api/assignments/${assignment.id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate assignments and refresh dashboard progress
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      toast({ title: "Status updated successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating status", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

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

  const isOverdue = new Date(assignment.deadline) < new Date() && assignment.status !== "completed";
  const daysUntilDeadline = Math.ceil(
    (new Date(assignment.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="unit-card">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="outline" className={getStatusColor(assignment.status)}>
                {getStatusIcon(assignment.status)}
                <span className="ml-1.5 capitalize">{assignment.status?.replace('_', ' ')}</span>
              </Badge>
              {assignment.type && (
                <Badge variant="secondary" className="text-xs">
                  {assignment.type.toUpperCase()}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg font-semibold text-neutral-800 mb-1">
              {assignment.title}
            </CardTitle>
            {assignment.description && (
              <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                {assignment.description}
              </p>
            )}
            
            <div className="flex items-center space-x-4 text-xs text-neutral-500">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>Due: {format(new Date(assignment.deadline), 'MMM d, yyyy')}</span>
              </div>
              
              {assignment.userGrade !== undefined && assignment.userGrade !== null && (
                <div className="flex items-center space-x-1">
                  <GraduationCap className="w-3 h-3" />
                  <span>
                    Grade: {assignment.userGrade}
                    {assignment.totalMarks && `/${assignment.totalMarks}`}
                    {assignment.totalMarks && (
                      <span className="ml-1">
                        ({Math.round((assignment.userGrade / assignment.totalMarks) * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
            
            {isOverdue && (
              <div className="mt-2 flex items-center space-x-1 text-red-600 text-xs">
                <AlertCircle className="w-3 h-3" />
                <span>Overdue by {Math.abs(daysUntilDeadline)} days</span>
              </div>
            )}
            
            {!isOverdue && assignment.status !== "completed" && daysUntilDeadline <= 3 && (
              <div className="mt-2 flex items-center space-x-1 text-orange-600 text-xs">
                <Clock className="w-3 h-3" />
                <span>Due in {daysUntilDeadline} {daysUntilDeadline === 1 ? 'day' : 'days'}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditor(true)}
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              {assignment.attachedFilePath ? "Edit Document" : "Add Document"}
            </Button>
            
            {assignment.status !== "completed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGradeDialog(true)}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <Award className="w-4 h-4 mr-2" />
                Submit Grade
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Assignment Editor Modal */}
      <AssignmentEditor 
        assignment={assignment}
        isOpen={showEditor}
        onOpenChange={setShowEditor}
      />

      {/* Delete Dialog */}
      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => deleteAssignmentMutation.mutate(assignment.id)}
        isDeleting={deleteAssignmentMutation.isPending}
        itemName={assignment.title}
      />

      {/* Grade Dialog */}
      <GradeDialog
        assignment={assignment}
        isOpen={showGradeDialog}
        onOpenChange={setShowGradeDialog}
      />
    </Card>
  );
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

// Removed duplicate AssignmentCard function - keeping only the first one at line 751

export default function Assignments() {
  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/assignments"],
  });

  const pendingAssignments = assignments.filter((a: Assignment) => a.status === "pending");
  const inProgressAssignments = assignments.filter((a: Assignment) => a.status === "in_progress");
  const completedAssignments = assignments.filter((a: Assignment) => a.status === "completed");

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-neutral-200 rounded w-48"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-neutral-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-800">Assignments & CATs</h1>
            <p className="text-neutral-600 mt-1">
              Track assignments, CATs, and exams with grade input and document editing
            </p>
          </div>
          <CreateAssignmentDialog />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-lg font-semibold">{pendingAssignments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-lg font-semibold">{inProgressAssignments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-lg font-semibold">{completedAssignments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Graded</p>
                  <p className="text-lg font-semibold">
                    {assignments.filter((a) => a.userGrade !== null).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Categories */}
        <div className="space-y-8">
          {/* Pending Assignments */}
          {pendingAssignments.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-yellow-600" />
                <h2 className="text-xl font-semibold text-neutral-800">Pending</h2>
                <Badge variant="outline">{pendingAssignments.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingAssignments.map((assignment) => (
                  <AssignmentCard key={assignment.id} assignment={assignment} />
                ))}
              </div>
            </div>
          )}

          {/* In Progress Assignments */}
          {inProgressAssignments.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-neutral-800">In Progress</h2>
                <Badge variant="outline">{inProgressAssignments.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inProgressAssignments.map((assignment) => (
                  <AssignmentCard key={assignment.id} assignment={assignment} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Assignments */}
          {completedAssignments.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-neutral-800">Completed</h2>
                <Badge variant="outline">{completedAssignments.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedAssignments.map((assignment) => (
                  <AssignmentCard key={assignment.id} assignment={assignment} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {assignments.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first assignment or CAT</p>
              <CreateAssignmentDialog />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
