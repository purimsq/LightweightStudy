import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ArrowLeft } from "lucide-react";
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
  const [, setLocation] = useLocation();

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Import pdf.js dynamically
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set worker source to local server
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';
        
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdfDoc = await loadingTask.promise;
        
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF file');
        setLoading(false);
      }
    };

    if (fileUrl) {
      loadPDF();
    }
  }, [fileUrl]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdf || !canvasRef.current) return;

      try {
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
        setError('Failed to render PDF page');
      }
    };

    renderPage();
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

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-stone-100 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg border border-stone-200">
          <div className="animate-spin w-10 h-10 border-4 border-stone-300 border-t-stone-600 rounded-full mx-auto mb-4"></div>
          <p className="text-stone-700 font-medium">Loading PDF document...</p>
          <p className="text-stone-500 text-sm mt-2">Please wait while we prepare your document</p>
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

  return (
    <div className="bg-gradient-to-br from-slate-50 to-stone-100 min-h-screen">
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
      <div className="p-6 flex justify-center">
        <div className="bg-white shadow-2xl rounded-lg border border-stone-200 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="max-w-full"
            style={{ display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}