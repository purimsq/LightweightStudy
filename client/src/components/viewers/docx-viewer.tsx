import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface DOCXViewerProps {
  fileUrl: string;
  filename: string;
  documentId?: string;
  unitId?: number;
}

export default function DOCXViewer({ fileUrl, filename, documentId, unitId }: DOCXViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const loadDOCX = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the DOCX file
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch DOCX file');
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Import mammoth dynamically
        const mammoth = await import('mammoth');
        
        // Convert DOCX to HTML
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        if (result.messages && result.messages.length > 0) {
          console.warn('DOCX conversion warnings:', result.messages);
        }
        
        setHtmlContent(result.value);
        setLoading(false);
      } catch (err) {
        console.error('Error loading DOCX:', err);
        setError('Failed to load DOCX file');
        setLoading(false);
      }
    };

    if (fileUrl) {
      loadDOCX();
    }
  }, [fileUrl]);

  const downloadFile = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    link.click();
  };

  const goBack = () => {
    if (unitId) {
      setLocation(`/units/${unitId}/documents`);
    } else {
      setLocation("/units");
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-stone-100 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg border border-stone-200">
          <div className="animate-spin w-10 h-10 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-stone-700 font-medium">Loading DOCX document...</p>
          <p className="text-stone-500 text-sm mt-2">Converting document to readable format</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-stone-100 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg border border-red-200">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <p className="text-stone-500 text-sm mb-4">Make sure the DOCX file is valid and accessible.</p>
          <div className="space-x-3">
            <Button 
              onClick={downloadFile} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Original
            </Button>
            <Button 
              variant="outline" 
              onClick={goBack}
              className="bg-white hover:bg-stone-50 border-stone-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-stone-100 min-h-screen">
      {/* DOCX Controls */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-stone-200 shadow-sm sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goBack}
              className="bg-white hover:bg-stone-50 border-stone-200 text-stone-700 hover:text-stone-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Unit
            </Button>
            <div className="flex items-center space-x-3 bg-blue-50 rounded-lg px-3 py-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900 max-w-md truncate">{filename}</span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadFile}
            className="bg-white hover:bg-stone-50 border-stone-200 text-stone-700 hover:text-stone-900"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* DOCX Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-2xl rounded-lg border border-stone-200 overflow-hidden">
            <div 
              className="p-12 min-h-[800px] bg-white"
              style={{ 
                fontFamily: 'Georgia, "Times New Roman", serif',
                lineHeight: '1.8',
                fontSize: '16px'
              }}
            >
              <div 
                className="prose prose-lg max-w-none prose-stone"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
                style={{
                  color: '#374151',
                  wordWrap: 'break-word'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}