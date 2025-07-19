import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, ArrowLeft, Menu, BookOpen } from "lucide-react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [outline, setOutline] = useState<Array<{title: string, id: string, level: number}>>([]);
  const [, setLocation] = useLocation();

  // Keyboard navigation for DOCX (smooth scrolling with arrow keys)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when not typing in inputs or textarea
      const target = event.target as HTMLElement;
      if (target?.tagName === 'INPUT' || 
          target?.tagName === 'TEXTAREA' ||
          target?.isContentEditable) {
        return;
      }
      
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        window.scrollBy({ top: -200, behavior: 'smooth' });
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        window.scrollBy({ top: 200, behavior: 'smooth' });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const loadDOCX = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the DOCX file with caching
        const response = await fetch(fileUrl, {
          cache: 'force-cache', // Enable caching for faster subsequent loads
          priority: 'high', // High priority for document loading
        });
        if (!response.ok) {
          throw new Error('Failed to fetch DOCX file');
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Import mammoth dynamically
        const mammoth = await import('mammoth');
        
        // Convert DOCX to HTML with optimized settings
        const result = await mammoth.convertToHtml({ 
          arrayBuffer,
          options: {
            convertImage: mammoth.images.imgElement(function(image: any) {
              // Optimize image handling - convert to base64 for faster loading
              return image.read("base64").then(function(imageBuffer: any) {
                return {
                  src: "data:" + image.contentType + ";base64," + imageBuffer
                };
              });
            }),
            // Optimize paragraph spacing
            styleMap: [
              "p[style-name='Normal'] => p:fresh",
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh",
            ]
          }
        });
        
        if (result.messages && result.messages.length > 0) {
          console.warn('DOCX conversion warnings:', result.messages);
        }
        
        // Extract headings for outline - more efficient processing
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = result.value;
        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        const extractedOutline = Array.from(headings).map((heading, index) => {
          const level = parseInt(heading.tagName.substring(1)) - 1;
          const id = `heading-${index}`;
          heading.id = id; // Add ID for scrolling
          
          return {
            title: heading.textContent?.slice(0, 50) + (heading.textContent && heading.textContent.length > 50 ? '...' : '') || `Heading ${index + 1}`,
            id,
            level
          };
        });
        
        setOutline(extractedOutline);
        setHtmlContent(tempDiv.innerHTML);
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

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setSidebarOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-stone-100 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg border border-stone-200">
          <div className="animate-spin w-10 h-10 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-stone-700 font-medium">Loading DOCX document...</p>
          <p className="text-stone-500 text-sm mt-2">Large files may take a few moments to convert</p>
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
    <div className="bg-gradient-to-br from-slate-50 to-stone-100 min-h-screen relative">
      

      {/* Sidebar Overlay */}
      <div className={`fixed top-0 left-0 h-full bg-white border-r border-stone-200 shadow-xl transition-all duration-300 z-30 ${sidebarOpen ? 'w-80 translate-x-0' : 'w-80 -translate-x-full'}`}>
        <div className="p-4 border-b border-stone-200">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-stone-600" />
            <h3 className="font-medium text-stone-800">Document Outline</h3>
          </div>
        </div>
        <div className="p-4 space-y-2 max-h-[calc(100vh-140px)] overflow-y-auto">
          {outline.length > 0 ? (
            outline.map((item, index) => (
              <button
                key={index}
                onClick={() => scrollToHeading(item.id)}
                className={`w-full text-left p-2 rounded-lg transition-colors hover:bg-stone-100 text-stone-700 ${
                  item.level === 1 ? 'ml-4 text-sm' : 
                  item.level === 2 ? 'ml-8 text-sm' : 'font-medium'
                }`}
              >
                {item.title}
              </button>
            ))
          ) : (
            <div className="text-center text-stone-500 py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No headings found in this document</p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Background Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="bg-white hover:bg-stone-50 border-stone-200 text-stone-700 hover:text-stone-900"
              >
                <Menu className="w-4 h-4 mr-2" />
                Outline
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
        <div className="p-6 flex-1">
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
    </div>
  );
}