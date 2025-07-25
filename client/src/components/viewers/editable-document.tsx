import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Edit, Eye, Download } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EditableDocumentProps {
  documentId: string;
  initialContent: string;
  filename: string;
  unitId?: number;
  fileType: string;
  filePath: string;
  onClose?: () => void;
}

export default function EditableDocument({ 
  documentId, 
  initialContent, 
  filename, 
  unitId, 
  fileType,
  filePath,
  onClose
}: EditableDocumentProps) {
  // Helper function to convert HTML to plain text with markdown-like formatting
  const htmlToPlainText = (html: string) => {
    if (!html) return '';
    
    // Replace common HTML tags with markdown-like equivalents
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
      .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '$1\n')
      .replace(/<ol[^>]*>(.*?)<\/ol>/gi, '$1\n')
      .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
      .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  };

  // Helper function to convert plain text with markdown to HTML
  const plainTextToHtml = (text: string) => {
    if (!text) return '';
    
    return text
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
      .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<u>$1</u>')
      .replace(/^• (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.*)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<h[1-6]>)/g, '$1')
      .replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  };

  const [content, setContent] = useState(htmlToPlainText(initialContent || ""));
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setHasChanges(content !== htmlToPlainText(initialContent));
  }, [content, initialContent]);

  const saveDocumentMutation = useMutation({
    mutationFn: async (updatedContent: string) => {
      const htmlContent = plainTextToHtml(updatedContent);
      const response = await apiRequest("PATCH", `/api/assignments/${documentId}`, {
        extractedText: htmlContent
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      setIsEditing(false);
      setHasChanges(false);
      toast({ title: "Assignment saved successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error saving document", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSave = () => {
    saveDocumentMutation.mutate(content);
  };

  const handleCancel = () => {
    setContent(htmlToPlainText(initialContent));
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleDownload = () => {
    // Create a blob with the current content (edited version)
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Create download link with edited content
    const link = document.createElement('a');
    link.href = url;
    
    // Keep original file extension or add .txt if none
    const fileExtension = filename.includes('.') ? filename.split('.').pop() : 'txt';
    const baseName = filename.includes('.') ? filename.replace(/\.[^/.]+$/, '') : filename;
    link.download = `${baseName}_edited.${fileExtension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL
    URL.revokeObjectURL(url);
  };

  const goBack = () => {
    if (onClose) {
      onClose(); // Close modal when used within assignments
    } else {
      setLocation("/assignments"); // Navigate when used as standalone page
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={goBack} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-bold text-neutral-800">{filename}</h1>
              <p className="text-neutral-600 text-xs">
                {fileType} • {isEditing ? "Editing Mode" : "View Mode"}
                {hasChanges && <span className="text-orange-600 ml-2">• Unsaved Changes</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={!hasChanges || saveDocumentMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saveDocumentMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleDownload}
                  title={hasChanges ? "Download edited version" : "Download current version"}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {hasChanges ? "Download Edited" : "Download"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="pt-20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg border border-neutral-200 overflow-hidden">
            {/* Document Status Bar */}
            <div className="bg-neutral-50 border-b border-neutral-200 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-neutral-600">
                  <span className={`w-2 h-2 rounded-full ${isEditing ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                  <span>{isEditing ? 'Editing' : 'Viewing'}</span>
                </div>
                <div className="text-sm text-neutral-500">
                  {content.split(' ').length} words • {content.length} characters
                  {hasChanges && <span className="text-orange-600 ml-2">• Modified</span>}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs"
                >
                  {isEditing ? <Eye className="w-3 h-3 mr-1" /> : <Edit className="w-3 h-3 mr-1" />}
                  {isEditing ? 'Preview' : 'Edit'}
                </Button>
              </div>
            </div>
            
            {/* Content Area */}
            <div className="min-h-[800px] max-h-[calc(95vh-200px)] overflow-auto">
              <div 
                className="p-12 min-h-[800px]"
                style={{ 
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  lineHeight: '1.8',
                  fontSize: '16px'
                }}
              >
                <div 
                  className="prose prose-lg max-w-none text-neutral-900"
                  style={{
                    wordWrap: 'break-word',
                    hyphens: 'auto',
                    textAlign: 'justify'
                  }}
                  contentEditable={isEditing}
                  suppressContentEditableWarning={true}
                  dangerouslySetInnerHTML={{ 
                    __html: plainTextToHtml(content) || "No content available. Click Edit to start adding content." 
                  }}
                  onInput={isEditing ? (e) => {
                    const target = e.target as HTMLElement;
                    const plainText = htmlToPlainText(target.innerHTML);
                    setContent(plainText);
                  } : undefined}
                  onBlur={isEditing ? (e) => {
                    const target = e.target as HTMLElement;
                    const plainText = htmlToPlainText(target.innerHTML);
                    setContent(plainText);
                  } : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}