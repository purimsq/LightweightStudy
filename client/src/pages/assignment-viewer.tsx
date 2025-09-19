import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Edit, Eye, Save } from "lucide-react";
import { useState } from "react";
import type { Assignment } from "@shared/schema";
import PDFViewer from "@/components/viewers/pdf-viewer";
import DOCXViewer from "@/components/viewers/docx-viewer";
import EditableDocument from "@/components/viewers/editable-document";

export default function AssignmentViewer() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const assignmentId = parseInt(id!);

  const { data: assignment, isLoading, error } = useQuery({
    queryKey: ["/api/assignments", assignmentId],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch assignment");
      }
      return response.json() as Promise<Assignment>;
    },
  });

  const handleDownload = () => {
    if (assignment?.attachedFilePath) {
      const link = document.createElement("a");
      link.href = assignment.attachedFilePath;
      link.download = assignment.attachedFileName || "assignment-file";
      link.click();
    }
  };

  const goBack = () => {
    setLocation("/assignments");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-700 font-medium">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">Failed to load assignment</p>
          <Button onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assignments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={goBack} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignments
            </Button>
            <div>
              <h1 className="text-lg font-bold text-neutral-800">{assignment.title}</h1>
              <p className="text-neutral-600 text-sm">
                {assignment.type} • Due: {new Date(assignment.deadline).toLocaleDateString()}
                {assignment.attachedFileName && ` • ${assignment.attachedFileName}`}
              </p>
            </div>
          </div>
          {assignment.attachedFilePath && (
            <Button variant="outline" onClick={handleDownload} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* Assignment Content */}
      <div className="pt-20 p-6">
        <div className="max-w-6xl mx-auto">
          {assignment.attachedFilePath ? (
            // Show file viewer based on type
            assignment.attachedFileType === "application/pdf" ? (
              <PDFViewer 
                fileUrl={assignment.attachedFilePath} 
                documentId={assignment.id.toString()}
              />
            ) : assignment.attachedFileType?.includes("document") ? (
              <DOCXViewer 
                fileUrl={assignment.attachedFilePath} 
                filename={assignment.attachedFileName || "document.docx"}
                documentId={assignment.id.toString()}
              />
            ) : (
              // Show text content or editable area for other file types
              <div className="bg-white shadow-xl rounded-lg border border-neutral-200">
                <div className="p-8">
                  <div className="prose prose-lg max-w-none">
                    <p className="text-neutral-700 leading-relaxed">
                      {assignment.description || "No description provided for this assignment."}
                    </p>
                  </div>
                  <div className="mt-6 pt-6 border-t border-neutral-200">
                    <Button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = assignment.attachedFilePath!;
                        link.download = assignment.attachedFileName || 'document';
                        link.click();
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                </div>
              </div>
            )
          ) : (
            // Show assignment description when no file is attached
            <div className="bg-white shadow-xl rounded-lg border border-neutral-200">
              <div className="p-8">
                <h2 className="text-xl font-bold text-neutral-800 mb-4">Assignment Details</h2>
                <div className="prose prose-lg max-w-none">
                  <p className="text-neutral-700 leading-relaxed">
                    {assignment.description || "No description provided for this assignment."}
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-neutral-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-neutral-700">Type:</span>
                      <span className="ml-2 text-neutral-600">{assignment.type}</span>
                    </div>
                    <div>
                      <span className="font-medium text-neutral-700">Total Marks:</span>
                      <span className="ml-2 text-neutral-600">{assignment.totalMarks || "Not specified"}</span>
                    </div>
                    <div>
                      <span className="font-medium text-neutral-700">Status:</span>
                      <span className="ml-2 text-neutral-600 capitalize">{assignment.status}</span>
                    </div>
                    <div>
                      <span className="font-medium text-neutral-700">Deadline:</span>
                      <span className="ml-2 text-neutral-600">
                        {new Date(assignment.deadline).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}