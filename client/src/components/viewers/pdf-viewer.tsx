import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ArrowLeft, Menu, BookOpen, FileText } from "lucide-react";
import { useLocation } from "wouter";

interface PDFViewerProps {
  fileUrl: string;
  documentId?: string;
  unitId?: number;
}

export default function PDFViewer({ fileUrl, documentId, unitId }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Keyboard navigation for PDF with throttling to prevent errors
  useEffect(() => {
    let isNavigating = false;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with form inputs
      const target = event.target as HTMLElement;
      if (target?.tagName === 'INPUT' || 
          target?.tagName === 'TEXTAREA' ||
          target?.isContentEditable) {
        return;
      }

      if (isNavigating) return; // Prevent rapid navigation
      
      if (event.key === 'ArrowLeft' && currentPage > 1) {
        event.preventDefault();
        isNavigating = true;
        goToPrevPage();
        setTimeout(() => { isNavigating = false; }, 300); // Increased throttle
      } else if (event.key === 'ArrowRight' && currentPage < totalPages) {
        event.preventDefault();
        isNavigating = true;
        goToNextPage();
        setTimeout(() => { isNavigating = false; }, 300); // Increased throttle
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Import pdf.js dynamically
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set worker source to local server
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';
        
        // Advanced performance settings for large PDFs
        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          enableXfa: false, // Disable XFA for faster loading
          isEvalSupported: false, // Disable eval for security and performance
          disableFontFace: false, // Keep fonts enabled for better rendering
          useSystemFonts: true, // Use system fonts when possible
          maxImageSize: 2048 * 2048, // Allow larger images but with limit
          verbosity: 0, // Reduce console output
          // Advanced memory and performance settings
          cMapUrl: undefined, // Don't load CMaps unless needed
          cMapPacked: false,
          nativeImageDecoderSupport: 'display', // Use native image decoder
          useWorkerFetch: true, // Use worker for fetching
          rangeChunkSize: 65536, // 64KB chunks for streaming
          disableRange: false, // Enable range requests for large files
          disableStream: false, // Enable streaming
          disableAutoFetch: false, // Enable auto-fetching of pages
          pdfBug: false, // Disable debugging for performance
        });
        
        // Enhanced progress callback for large PDFs with timeout handling
        loadingTask.onProgress = (progressData: any) => {
          if (progressData.total > 0) {
            const percent = Math.round((progressData.loaded / progressData.total) * 100);
            console.log(`PDF loading: ${percent}% (${(progressData.loaded / 1024 / 1024).toFixed(1)} MB / ${(progressData.total / 1024 / 1024).toFixed(1)} MB)`);
          }
        };

        // Add timeout for very large files
        const timeoutId = setTimeout(() => {
          console.warn('PDF loading is taking longer than expected for large file');
        }, 30000); // 30 second warning
        
        const pdfDoc = await loadingTask.promise;
        
        // Clear timeout on successful load
        clearTimeout(timeoutId);
        
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setCurrentPage(1);
        setLoading(false);
        
        console.log(`PDF loaded successfully: ${pdfDoc.numPages} pages`);
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        clearTimeout(timeoutId); // Clear timeout on error
        
        // Enhanced error handling for large PDFs
        let errorMessage = 'Failed to load PDF file';
        if (err.name === 'NetworkError' || err.name === 'TimeoutError') {
          errorMessage = 'Network timeout while loading large PDF. Please try again.';
        } else if (err.name === 'InvalidPDFException') {
          errorMessage = 'Invalid or corrupted PDF file.';
        } else if (err.name === 'MissingPDFException') {
          errorMessage = 'PDF file not found.';
        } else if (err.name === 'PasswordException') {
          errorMessage = 'This PDF is password protected.';
        } else if (err.message) {
          errorMessage += `: ${err.message}`;
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };

    if (fileUrl) {
      loadPDF();
    }
  }, [fileUrl]);

  useEffect(() => {
    let renderTask: any = null;

    const renderPage = async () => {
      if (!pdf || !canvasRef.current) return;

      try {
        // Cancel any ongoing render task
        if (renderTask) {
          renderTask.cancel();
        }

        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { 
          alpha: false, // Disable alpha for better performance
          desynchronized: true, // Allow async rendering
          willReadFrequently: false // Optimize for write-only operations
        });
        
        if (!context) return;
        
        // Optimize canvas rendering for large PDFs
        const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
        const scaledViewport = page.getViewport({ scale: scale * devicePixelRatio });
        
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        
        context.scale(devicePixelRatio, devicePixelRatio);
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          enableWebGL: false, // Disable WebGL for compatibility with large PDFs
          renderInteractiveForms: false, // Disable forms for faster rendering
          intent: 'display', // Optimize for display
          // Enhanced performance settings
          optionalContentConfigPromise: null, // Skip optional content for speed
          annotationMode: 0, // Disable annotations for performance
          textLayerMode: 0, // Disable text layer for performance
          imageLayer: false, // Disable image layer for performance
        };
        
        // Clear canvas before rendering
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set white background for better contrast
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        renderTask = page.render(renderContext);
        await renderTask.promise;
        
        // Clean up the page object to free memory
        page.cleanup();
        
        // Force garbage collection for large PDFs (if available)
        if (window.gc && typeof window.gc === 'function') {
          window.gc();
        }
        
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
          setError(`Failed to render PDF page: ${err.message}`);
        }
      }
    };

    renderPage();

    // Cleanup function
    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, currentPage, scale]);

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(scale * 1.2);
  };

  const zoomOut = () => {
    setScale(scale / 1.2);
  };

  const goBack = () => {
    if (unitId) {
      setLocation(`/units/${unitId}/documents`);
    } else {
      setLocation("/units");
    }
  };

  // Generate outline based on page numbers for PDF
  const generateOutline = () => {
    const outline = [];
    const sectionsPerChapter = Math.ceil(totalPages / 5); // Roughly 5 pages per section
    
    for (let i = 1; i <= totalPages; i += sectionsPerChapter) {
      const endPage = Math.min(i + sectionsPerChapter - 1, totalPages);
      outline.push({
        title: `Pages ${i}-${endPage}`,
        page: i,
        level: 0
      });
      
      // Add sub-sections for larger chapters
      if (sectionsPerChapter > 3) {
        const midPoint = Math.floor((i + endPage) / 2);
        if (midPoint > i && midPoint < endPage) {
          outline.push({
            title: `Section ${Math.ceil(i / sectionsPerChapter)}.1`,
            page: i,
            level: 1
          });
          outline.push({
            title: `Section ${Math.ceil(i / sectionsPerChapter)}.2`,
            page: midPoint,
            level: 1
          });
        }
      }
    }
    
    return outline;
  };

  const jumpToPage = (page: number) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-stone-100 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg border border-stone-200">
          <div className="animate-spin w-10 h-10 border-4 border-stone-300 border-t-stone-600 rounded-full mx-auto mb-4"></div>
          <p className="text-stone-700 font-medium">Loading PDF document...</p>
          <p className="text-stone-500 text-sm mt-2">Large files may take a few moments to load</p>
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
          <p className="text-stone-500 text-sm">Make sure the PDF file is valid and accessible.</p>
          <Button 
            variant="outline" 
            onClick={goBack}
            className="mt-4 bg-white hover:bg-stone-50 border-stone-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const outline = generateOutline();

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
          {outline.map((item, index) => (
            <button
              key={index}
              onClick={() => jumpToPage(item.page)}
              className={`w-full text-left p-2 rounded-lg transition-colors ${
                currentPage >= item.page && (index === outline.length - 1 || currentPage < outline[index + 1]?.page)
                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                  : 'hover:bg-stone-100 text-stone-700'
              } ${item.level === 1 ? 'ml-4 text-sm' : 'font-medium'}`}
            >
              {item.title}
            </button>
          ))}
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
        {/* PDF Controls */}
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
              <div className="flex items-center space-x-3 bg-stone-100 rounded-lg px-3 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevPage}
                  disabled={currentPage <= 1}
                  className="h-8 w-8 p-0 hover:bg-stone-200 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-stone-700 min-w-[80px] text-center">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8 p-0 hover:bg-stone-200 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 bg-stone-100 rounded-lg px-3 py-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={zoomOut}
                className="h-8 w-8 p-0 hover:bg-stone-200"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-stone-700 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={zoomIn}
                className="h-8 w-8 p-0 hover:bg-stone-200"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* PDF Canvas */}
        <div className="p-6 flex justify-center flex-1">
          <div className="bg-white shadow-2xl rounded-lg border border-stone-200 overflow-hidden">
            <canvas
              ref={canvasRef}
              className="max-w-full"
              style={{ display: 'block' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}