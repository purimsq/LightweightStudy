import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Download, Eye } from "lucide-react";
import type { Document, Unit } from "@shared/schema";

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
    <div className="p-6 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="gradient-card rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/units")}
                className="flex items-center space-x-2 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Units</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-shimmer mb-2">
                  {unit?.name || "Unknown Unit"}
                </h1>
                <p className="text-lg text-neutral-600">
                  {documents.length} documents
                </p>
              </div>
            </div>
            <DocumentUploadModal unitId={unitId} />
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
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentCard({ document }: { document: Document }) {
  const [, setLocation] = useLocation();
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("doc")) return "📝";
    return "📁";
  };

  return (
    <div className="document-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center text-xl shadow-sm">
            {getFileIcon(document.fileType)}
          </div>
          <div>
            <h3 className="font-semibold text-neutral-800 mb-1">{document.filename}</h3>
            <p className="text-sm text-neutral-600">
              {document.fileType.split('/').pop()?.toUpperCase()} • Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation(`/documents/${document.id}`)}
            className="hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="hover:bg-neutral-100 transition-colors"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </div>
      
      {document.summary && (
        <div className="mt-4 p-4 glass-card rounded-lg">
          <p className="text-sm text-neutral-700 leading-relaxed">
            <span className="font-medium text-primary">AI Summary:</span> {document.summary}
          </p>
        </div>
      )}
    </div>
  );
}