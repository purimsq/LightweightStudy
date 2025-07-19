import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, FileText, Download, Eye, Trash2, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Document, Unit } from "@shared/schema";

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

function DocumentCard({ document, onDelete }: { document: Document; onDelete: () => void }) {
  const [, setLocation] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await apiRequest("DELETE", `/api/documents/${documentId}`);
      if (!response.ok) throw new Error("Failed to delete document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setShowDeleteDialog(false);
      onDelete();
      toast({ title: "Document deleted successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting document", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return (
    <Card className="unit-card hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base text-neutral-800 truncate">
                {document.title}
              </CardTitle>
              <p className="text-sm text-neutral-600 mt-1">
                {document.type.toUpperCase()} • {new Date(document.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex space-x-1 ml-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/documents/${document.id}/view`)}
              className="px-2"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="px-2 text-red-600 hover:text-red-700 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => deleteDocumentMutation.mutate(document.id)}
        title="Delete Document"
        description="This will permanently delete this document and all its notes. This action cannot be undone."
        itemName={document.title}
        isDeleting={deleteDocumentMutation.isPending}
      />
    </Card>
  );
}

export default function UnitDocuments() {
  const [location, setLocation] = useLocation();
  const unitId = parseInt(location.split("/")[2]);

  const { data: unit, isLoading: unitLoading } = useQuery({
    queryKey: ["/api/units", unitId],
    queryFn: async () => {
      const response = await fetch(`/api/units/${unitId}`);
      if (!response.ok) throw new Error("Failed to fetch unit");
      return response.json();
    },
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["/api/documents", { unitId }],
    queryFn: async () => {
      const response = await fetch(`/api/documents?unitId=${unitId}`);
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
  });

  if (unitLoading || documentsLoading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-neutral-200 rounded w-64"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-neutral-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setLocation("/units")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Units</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">
                {unit?.name || "Unknown Unit"}
              </h1>
              <p className="text-neutral-600 text-sm mt-1">
                {documents.length} documents
              </p>
            </div>
          </div>
        </div>

        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-800 mb-2">
                No documents yet
              </h3>
              <p className="text-neutral-600 mb-4">
                Upload documents to this unit to get started
              </p>
              <Button 
                onClick={() => setLocation("/units")}
                className="bg-primary hover:bg-primary/90"
              >
                Go back to units
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {documents.map((document: Document) => (
              <DocumentCard 
                key={document.id} 
                document={document} 
                onDelete={() => {
                  // Refresh documents when one is deleted
                  queryClient.invalidateQueries({ queryKey: ["/api/documents", { unitId }] });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

