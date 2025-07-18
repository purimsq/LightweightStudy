import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, BookOpen, FileText, Eye } from "lucide-react";
import { useState } from "react";
import type { Document } from "@shared/schema";

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
    if (unit) {
      setLocation(`/units/${unit.id}/documents`);
    } else {
      setLocation("/units");
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">{document.filename}</h1>
              <p className="text-neutral-600 text-sm">
                {unit?.name} • {document.fileType} • Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex bg-neutral-100 rounded-lg p-1">
              <Button
                variant={viewMode === "text" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("text")}
                className="px-3 py-1 text-xs"
              >
                <FileText className="w-3 h-3 mr-1" />
                Text
              </Button>
              <Button
                variant={viewMode === "original" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("original")}
                className="px-3 py-1 text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                Original
              </Button>
            </div>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {document.summary && (
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardContent className="p-6">
                <div className="flex items-center mb-3">
                  <BookOpen className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-neutral-800">AI Summary</h3>
                </div>
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="text-neutral-800 leading-relaxed">{document.summary}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-2 border-neutral-200">
            <CardContent className="p-6">
              {viewMode === "text" ? (
                <div>
                  <h3 className="font-semibold text-neutral-800 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Extracted Text Content
                  </h3>
                  {document.extractedText ? (
                    <div className="prose max-w-none">
                      <div className="bg-white p-8 rounded-lg border-2 border-neutral-200 shadow-sm">
                        <div className="text-base text-neutral-900 font-normal leading-relaxed whitespace-pre-wrap">
                          {document.extractedText}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                      <p className="text-neutral-600">No text content extracted yet</p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Text extraction may take a moment to process
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-neutral-800 mb-4 flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Original Document
                  </h3>
                  <div className="bg-neutral-50 p-6 rounded-lg border">
                    {document.fileType.includes("pdf") ? (
                      <div className="text-center py-12">
                        <div className="bg-red-100 text-red-600 p-4 rounded-lg max-w-md mx-auto">
                          <FileText className="w-12 h-12 mx-auto mb-3" />
                          <h4 className="font-medium mb-2">PDF Viewer</h4>
                          <p className="text-sm">
                            PDF viewing requires a PDF viewer. Click download to open in your default PDF reader.
                          </p>
                          <Button 
                            onClick={handleDownload}
                            className="mt-3 bg-red-600 hover:bg-red-700"
                            size="sm"
                          >
                            Open in PDF Reader
                          </Button>
                        </div>
                      </div>
                    ) : document.fileType.includes("doc") ? (
                      <div className="text-center py-12">
                        <div className="bg-blue-100 text-blue-600 p-4 rounded-lg max-w-md mx-auto">
                          <FileText className="w-12 h-12 mx-auto mb-3" />
                          <h4 className="font-medium mb-2">Word Document</h4>
                          <p className="text-sm">
                            Word document viewing requires Microsoft Word or compatible application.
                          </p>
                          <Button 
                            onClick={handleDownload}
                            className="mt-3 bg-blue-600 hover:bg-blue-700"
                            size="sm"
                          >
                            Open in Word
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                        <p className="text-neutral-600">Preview not available for this file type</p>
                        <Button onClick={handleDownload} className="mt-3" size="sm">
                          Download to view
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Study Actions */}
          <Card className="border-2 border-green-200 bg-green-50/30">
            <CardContent className="p-6">
              <h3 className="font-semibold text-neutral-800 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 text-green-600 mr-2" />
                Study Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="justify-start border-green-300 hover:bg-green-50 hover:border-green-400"
                >
                  <BookOpen className="w-4 h-4 mr-2 text-green-600" />
                  Take Notes
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start border-blue-300 hover:bg-blue-50 hover:border-blue-400"
                >
                  <FileText className="w-4 h-4 mr-2 text-blue-600" />
                  Create Summary
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start border-purple-300 hover:bg-purple-50 hover:border-purple-400"
                >
                  <Eye className="w-4 h-4 mr-2 text-purple-600" />
                  Generate Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}