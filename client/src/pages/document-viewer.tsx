import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, BookOpen, FileText, Eye } from "lucide-react";
import { useState } from "react";
import type { Document } from "@shared/schema";
import PDFViewer from "@/components/viewers/pdf-viewer";
import DOCXViewer from "@/components/viewers/docx-viewer";

export default function DocumentViewer() {
  const [location, setLocation] = useLocation();
  const documentId = parseInt(location.split("/")[2]);
  const [viewMode, setViewMode] = useState<"text" | "original">("text");

  const { data: document, isLoading } = useQuery({
    queryKey: ["/api/documents", documentId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) throw new Error("Failed to fetch document");
      return response.json();
    },
  });

  const { data: unit } = useQuery({
    queryKey: ["/api/units", document?.unitId],
    queryFn: async () => {
      if (!document?.unitId) return null;
      const response = await fetch(`/api/units/${document.unitId}`);
      if (!response.ok) throw new Error("Failed to fetch unit");
      return response.json();
    },
    enabled: !!document?.unitId,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-neutral-200 rounded w-64"></div>
            <div className="h-96 bg-neutral-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-neutral-800 mb-4">Document not found</h1>
          <Button onClick={() => setLocation("/units")} variant="outline">
            Back to Units
          </Button>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    // Create a download link - in a real app this would download the actual file
    const link = document.createElement('a');
    link.href = document.filePath;
    link.download = document.originalName;
    link.click();
  };

  const goBack = () => {
    if (document?.unitId) {
      setLocation(`/units/${document.unitId}/documents`);
    } else {
      setLocation("/units");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={goBack} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-bold text-neutral-800">{document.filename}</h1>
              <p className="text-neutral-600 text-xs">
                {unit?.name} • {document.fileType} • {new Date(document.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs"
              onClick={() => setLocation(`/documents/${documentId}/notes`)}
            >
              <BookOpen className="w-3 h-3 mr-2" />
              Notes
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs"
              onClick={() => setLocation(`/documents/${documentId}/summary`)}
            >
              <FileText className="w-3 h-3 mr-2" />
              Summary
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs"
              onClick={() => setLocation(`/documents/${documentId}/quiz`)}
            >
              <Eye className="w-3 h-3 mr-2" />
              Quiz
            </Button>
            <Button variant="outline" onClick={handleDownload} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="pt-20 px-8 pb-8 bg-neutral-50 min-h-screen">
        <div className="max-w-5xl mx-auto">
          {document.extractedText ? (
            <div className="bg-white">
              {/* Document Toolbar */}
              <div className="bg-white border border-neutral-200 rounded-t-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-neutral-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Document loaded</span>
                  </div>
                  <div className="text-sm text-neutral-500">
                    {document.extractedText.split(' ').length} words • {document.extractedText.length} characters
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-xs text-neutral-500">
                    Font: Georgia • Size: 16px • Zoom: 100%
                  </div>
                </div>
              </div>
              
              {/* Document Viewer */}
              {document.fileType === 'application/pdf' ? (
                <PDFViewer 
                  fileUrl={document.filePath} 
                  documentId={documentId.toString()}
                  unitId={document.unitId}
                />
              ) : document.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? (
                <DOCXViewer 
                  fileUrl={document.filePath} 
                  filename={document.filename}
                  documentId={documentId.toString()}
                  unitId={document.unitId}
                />
              ) : (
                <div className="bg-white shadow-lg border border-neutral-200 rounded-lg min-h-[800px]">
                  <div className="bg-white p-12 min-h-[800px]" style={{ 
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    lineHeight: '1.6',
                    fontSize: '16px'
                  }}>
                    <div 
                      className="text-neutral-900 whitespace-pre-wrap"
                      style={{
                        wordWrap: 'break-word',
                        hyphens: 'auto',
                        textAlign: 'justify'
                      }}
                    >
                      {document.extractedText}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-24">
              <FileText className="w-24 h-24 text-neutral-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">No text content available</h2>
              <p className="text-neutral-600 mb-4">
                This document hasn't been processed for text extraction yet.
              </p>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download Original File
              </Button>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}