import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, ArrowLeft, Menu, BookOpen } from "lucide-react";
import { useLocation } from "wouter";

interface DOCXViewerProps {
  fileUrl: string;
  filename: string;
  documentId?: string;
  unitId?: number;
  isEditing?: boolean;
  onContentChange?: (content: string) => void;
}

export default function DOCXViewer({ fileUrl, filename, documentId, unitId, isEditing, onContentChange }: DOCXViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [outline, setOutline] = useState<Array<{title: string, id: string, level: number}>>([]);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
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

        // Use the server's document extraction endpoint for DOCX files
        const extractedFilename = fileUrl.split('/').pop(); // Extract filename from URL
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/documents/${encodeURIComponent(extractedFilename || '')}/extract`, {
          cache: 'force-cache',
          priority: 'high',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to extract DOCX content');
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to extract DOCX content');
        }
        
        // Use the extracted HTML content from the server
        const htmlContent = data.content;
        
        // Extract headings for outline and add IDs to the HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        const extractedOutline = Array.from(headings).map((heading, index) => {
          const level = parseInt(heading.tagName.substring(1)) - 1;
          const id = `heading-${index}`;
          heading.id = id;
          
          console.log('🔍 Processing heading:', {
            index,
            tagName: heading.tagName,
            level,
            id,
            text: heading.textContent?.slice(0, 50)
          });
          
          return {
            title: heading.textContent?.slice(0, 50) + (heading.textContent && heading.textContent.length > 50 ? '...' : '') || `Heading ${index + 1}`,
            id,
            level
          };
        });
        
        console.log('🔍 Extracted outline:', extractedOutline);
        
        // Update the HTML content with the modified headings (now with IDs)
        const updatedHtmlContent = tempDiv.innerHTML;
        
        setOutline(extractedOutline);
        setHtmlContent(updatedHtmlContent);
        setLoading(false);
        
        // Set up intersection observer to track active heading
        setTimeout(() => {
          console.log('🔍 Setting up intersection observer for', headings.length, 'headings');
          
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  console.log('🔍 Active heading changed to:', entry.target.id);
                  setActiveHeading(entry.target.id);
                }
              });
            },
            {
              root: null, // Use viewport as root instead of specific container
              rootMargin: '-20% 0px -70% 0px',
              threshold: 0.1
            }
          );
          
          // Observe all headings
          headings.forEach((heading) => {
            console.log('🔍 Observing heading:', heading.id, heading.textContent?.slice(0, 30));
            observer.observe(heading);
          });
        }, 500); // Increased timeout to ensure DOM is ready
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
    console.log('DOCXViewer: goBack clicked, navigating to /assignments');
    window.location.href = '/assignments';
  };

  const scrollToHeading = (id: string) => {
    console.log('🔍 Attempting to scroll to heading:', id);
    const element = document.getElementById(id);
    console.log('🔍 Found element:', element);
    
    if (element) {
      // Try multiple scroll approaches
      try {
        // Method 1: Direct scrollIntoView with better options
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
        console.log('✅ Used scrollIntoView method');
      } catch (error) {
        console.log('❌ scrollIntoView failed:', error);
        
        // Method 2: Manual scroll calculation
        try {
          const scrollContainer = document.querySelector('.prose.prose-lg.max-w-none.prose-stone');
          if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const scrollTop = scrollContainer.scrollTop + (elementRect.top - containerRect.top) - 100;
            
            scrollContainer.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
            console.log('✅ Used manual scroll method');
          }
        } catch (error2) {
          console.log('❌ Manual scroll failed:', error2);
          
          // Method 3: Window scroll as last resort
          const elementTop = element.offsetTop;
          window.scrollTo({
            top: elementTop - 100,
            behavior: 'smooth'
          });
          console.log('✅ Used window scroll method');
        }
      }
      
      setSidebarOpen(false);
    } else {
      console.log('❌ Element not found with ID:', id);
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
        <div className="p-4 space-y-1 max-h-[calc(100vh-140px)] overflow-y-auto">
          {outline.length > 0 ? (
            outline.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  console.log('🔍 Outline item clicked:', item.title, 'ID:', item.id);
                  scrollToHeading(item.id);
                }}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm border-l-2 ${
                  activeHeading === item.id 
                    ? 'bg-blue-100 text-blue-800 border-blue-400 shadow-sm' 
                    : 'text-stone-700 border-transparent hover:border-blue-300'
                } ${
                  item.level === 0 ? 'ml-2 text-sm font-semibold' : 
                  item.level === 1 ? 'ml-4 text-sm' : 
                  item.level === 2 ? 'ml-6 text-xs' : 
                  'ml-8 text-xs'
                }`}
                title={`Jump to: ${item.title}`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    activeHeading === item.id 
                      ? 'bg-blue-600' 
                      : item.level === 0 ? 'bg-blue-500' : 
                        item.level === 1 ? 'bg-blue-400' : 
                        'bg-blue-300'
                  }`}></div>
                  <span className="truncate">{item.title}</span>
                </div>
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
                onClick={() => {
                  console.log('DOCXViewer: Button clicked!');
                  goBack();
                }}
                className="bg-white hover:bg-stone-50 border-stone-200 text-stone-700 hover:text-stone-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Assignments
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
        <div className="p-6 flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow-2xl rounded-lg border border-stone-200 overflow-hidden">
              <div 
                className="p-12 min-h-[800px] bg-white overflow-auto"
                style={{ 
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  lineHeight: '1.8',
                  fontSize: '16px',
                  maxHeight: 'calc(100vh - 200px)'
                }}
              >
                <div 
                  className={`prose prose-lg max-w-none prose-stone ${
                    isEditing 
                      ? 'bg-yellow-50 border-yellow-300 cursor-text focus:outline-none focus:ring-2 focus:ring-yellow-400 editing-mode' 
                      : ''
                  }`}
                  contentEditable={isEditing}
                  onInput={(e) => onContentChange && onContentChange(e.currentTarget.innerHTML)}
                  suppressContentEditableWarning={true}
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                  style={{
                    color: '#374151',
                    wordWrap: 'break-word',
                    ...(isEditing && {
                      backgroundColor: '#fefce8',
                      border: '2px solid #fde047',
                      borderRadius: '8px',
                      padding: '16px',
                      minHeight: '400px'
                    })
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