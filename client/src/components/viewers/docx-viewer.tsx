import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

interface DOCXViewerProps {
  fileUrl: string;
  filename: string;
}

export default function DOCXViewer({ fileUrl, filename }: DOCXViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading DOCX...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-neutral-500 text-sm">Make sure the DOCX file is valid and accessible.</p>
          <Button onClick={downloadFile} className="mt-4">
            <Download className="w-4 h-4 mr-2" />
            Download Original File
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* DOCX Controls */}
      <div className="bg-neutral-100 border-b border-neutral-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-neutral-800">{filename}</span>
        </div>
        
        <Button variant="outline" size="sm" onClick={downloadFile}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>

      {/* DOCX Content */}
      <div className="p-8 bg-neutral-50 min-h-screen">
        <div className="max-w-4xl mx-auto bg-white shadow-lg border border-neutral-200 rounded-lg">
          <div 
            className="p-12 min-h-[800px]"
            style={{ 
              fontFamily: 'Georgia, "Times New Roman", serif',
              lineHeight: '1.6',
              fontSize: '16px'
            }}
          >
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              style={{
                color: '#1f2937',
                wordWrap: 'break-word'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}