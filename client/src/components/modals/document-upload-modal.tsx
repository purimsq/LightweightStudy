import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CloudUpload, X, File, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
// import { usePageState } from "@/contexts/PageStateContext";
// import { useFileUpload } from "@/hooks/use-background-tasks";
// import { Progress } from "@/components/ui/progress";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentUploadModal({ isOpen, onClose }: DocumentUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  
  // Simple state without page persistence for now
  const [isUploading, setIsUploading] = useState(false);

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  const handleFileUpload = async () => {
    if (!selectedUnit || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('unitId', selectedUnit);

        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      // Invalidate all document-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      
      toast({ title: "Documents uploaded successfully!" });
      handleClose();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setSelectedUnit("");
    setIsDragging(false);
    setIsUploading(false);
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => 
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword"
    );

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid file type",
        description: "Please select only Word documents (.docx or .doc)",
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
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword"
    );

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid file type",
        description: "Please select only Word documents (.docx or .doc)",
        variant: "destructive",
      });
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    handleFileUpload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-neutral-800">Upload Documents</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Drop Zone */}
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
              accept=".docx,.doc"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button variant="outline" size="sm" type="button">
              Choose Files
            </Button>
            <p className="text-xs text-neutral-500 mt-2">
              Supports Word documents (.docx and .doc)
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
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedUnit || selectedFiles.length === 0 || isUploading}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isUploading ? (
                <div className="flex items-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Uploading...
                </div>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Upload Documents
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}