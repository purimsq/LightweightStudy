import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CloudUpload, X, File, CheckCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentUploadModal({ isOpen, onClose }: DocumentUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ files, unitId }: { files: File[], unitId: number }) => {
      // In a real app, this would upload files to the backend
      // For now, we'll simulate the upload
      for (const file of files) {
        const document = {
          unitId,
          filename: file.name,
          originalName: file.name,
          fileType: file.type,
          filePath: `/uploads/${file.name}`,
          extractedText: `This document contains study material for ${selectedUnit === "2" ? "human anatomy" : selectedUnit === "7" ? "biochemistry" : "medical studies"}. 

Key Topics Covered:
- Clinical applications and practical procedures
- Detailed examination protocols
- Essential terminology and definitions
- Case studies and real-world examples

This comprehensive resource provides in-depth coverage of fundamental concepts, clinical correlations, and practical applications essential for medical education. The content is structured to facilitate systematic learning and retention of key information.

Learning Objectives:
- Understand core principles and mechanisms
- Apply knowledge to clinical scenarios  
- Develop critical thinking skills
- Master essential terminology

Study Notes:
- Review material systematically
- Practice with sample questions
- Focus on clinical correlations
- Create summary notes for quick reference

The document includes detailed explanations, diagrams, and examples to support comprehensive understanding of the subject matter.`,
          summary: null,
          embeddings: null,
        };
        
        await apiRequest("POST", "/api/documents", document);
      }
    },
    onSuccess: () => {
      // Invalidate all document-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      // Force refresh dashboard data
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      toast({ title: "Documents uploaded successfully!" });
      handleClose();
    },
    onError: (error) => {
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleClose = () => {
    setSelectedFiles([]);
    setSelectedUnit("");
    setIsDragging(false);
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => 
      file.type === "application/pdf" || 
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword"
    );
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid file type",
        description: "Please select only PDF or Word documents",
        variant: "destructive",
      });
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(event.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type === "application/pdf" || 
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword"
    );
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (!selectedUnit || selectedFiles.length === 0) return;
    
    uploadMutation.mutate({ 
      files: selectedFiles, 
      unitId: parseInt(selectedUnit) 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CloudUpload className="w-5 h-5" />
            <span>Upload Documents</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Drag and Drop Area */}
          <Card
            className={`border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-neutral-300 hover:border-primary/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <CloudUpload className="mx-auto h-8 w-8 text-neutral-400 mb-4" />
            <p className="text-neutral-600 mb-2">Drag and drop your files here</p>
            <p className="text-sm text-neutral-500 mb-4">or click to browse</p>
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx,.doc"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button variant="outline" size="sm" type="button">
              Choose Files
            </Button>
            <p className="text-xs text-neutral-500 mt-2">
              Supports PDF and Word documents
            </p>
          </Card>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-neutral-700">Selected Files:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <File className="w-4 h-4 text-primary" />
                      <span className="text-sm text-neutral-700 truncate">
                        {file.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unit Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-2">
              Assign to Unit
            </label>
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Select a unit..." />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit: any) => (
                  <SelectItem key={unit.id} value={unit.id.toString()}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedUnit || selectedFiles.length === 0 || uploadMutation.isPending}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {uploadMutation.isPending ? (
                "Uploading..."
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
