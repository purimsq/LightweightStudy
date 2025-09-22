import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CloudUpload, X, File, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { usePageState } from "@/contexts/PageStateContext";
import { useFileUpload } from "@/hooks/use-background-tasks";
import { Progress } from "@/components/ui/progress";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentUploadModalWithBackground({ isOpen, onClose }: DocumentUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  
  // Use page state for persistence
  const { pageState, updatePageState } = usePageState('document-upload');
  const { uploadFile, getActiveTasks } = useFileUpload('document-upload');

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  // Restore state when modal opens
  useEffect(() => {
    if (isOpen && pageState?.data) {
      setSelectedFiles(pageState.data.selectedFiles || []);
      setSelectedUnit(pageState.data.selectedUnit || "");
    }
  }, [isOpen, pageState]);

  // Save state when it changes
  useEffect(() => {
    if (isOpen) {
      updatePageState({
        data: {
          selectedFiles,
          selectedUnit,
        },
      });
    }
  }, [selectedFiles, selectedUnit, isOpen, updatePageState]);

  const handleFileUpload = async () => {
    if (!selectedUnit || selectedFiles.length === 0) return;

    // Upload files in background
    for (const file of selectedFiles) {
      uploadFile(
        file,
        '/api/documents/upload',
        (result) => {
          toast({
            title: "Upload Complete",
            description: `${file.name} has been uploaded successfully`,
          });
          
          // Invalidate queries to refresh the UI
          queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
          queryClient.invalidateQueries({ queryKey: ["/api/units"] });
        },
        (error) => {
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}: ${error.message}`,
            variant: "destructive",
          });
        }
      );
    }

    // Clear the form
    setSelectedFiles([]);
    setSelectedUnit("");
    
    toast({
      title: "Upload Started",
      description: "Files are being uploaded in the background. You can continue using the app.",
    });
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

  const handleClose = () => {
    // Don't clear state on close - let it persist
    onClose();
  };

  const activeTasks = getActiveTasks();
  const hasActiveUploads = activeTasks.some(task => task.type === 'upload');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5" />
            Upload Documents
            {hasActiveUploads && (
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <Clock className="w-4 h-4" />
                Uploading...
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Unit Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Unit</label>
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a unit for your documents" />
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

          {/* File Upload Area */}
          <Card 
            className={`border-2 border-dashed transition-colors ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="p-8 text-center">
              <CloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
                <label htmlFor="file-input" className="cursor-pointer">
                  Choose Files
                </label>
              </Button>
              <p className="text-xs text-neutral-500 mt-2">
                Supports Word documents (.docx and .doc)
              </p>
            </div>
          </Card>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Selected Files ({selectedFiles.length})</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <File className="w-4 h-4 text-gray-500" />
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
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

          {/* Active Upload Progress */}
          {hasActiveUploads && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Upload Progress</h3>
              {activeTasks.map((task) => (
                <div key={task.id} className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Uploading...</span>
                    <span>{task.progress || 0}%</span>
                  </div>
                  <Progress value={task.progress || 0} className="h-2" />
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {hasActiveUploads ? 'Continue in Background' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleFileUpload}
              disabled={!selectedUnit || selectedFiles.length === 0}
            >
              <CloudUpload className="w-4 h-4 mr-2" />
              Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
