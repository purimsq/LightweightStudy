import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Sparkles, RefreshCw, Download, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SummaryPageProps {
  documentId: string;
}

export default function SummaryPage({ documentId }: SummaryPageProps) {
  const [location, setLocation] = useLocation();
  const [copiedSummary, setCopiedSummary] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch document details
  const { data: document } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
  });

  // Fetch existing summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: [`/api/documents/${documentId}/summary`],
  });

  // Generate summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/documents/${documentId}/generate-summary`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to generate summary");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/summary`] });
      toast({ title: "Summary generated successfully!" });
    },
    onError: () => {
      toast({ 
        title: "Failed to generate summary", 
        description: "Please ensure Ollama is running with the phi model",
        variant: "destructive" 
      });
    },
  });

  const goBack = () => {
    setLocation(`/documents/${documentId}`);
  };

  const handleGenerateSummary = () => {
    generateSummaryMutation.mutate();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      toast({ title: "Summary copied to clipboard!" });
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch (err) {
      toast({ title: "Failed to copy to clipboard", variant: "destructive" });
    }
  };

  const downloadSummary = () => {
    if (!summary?.content) return;
    
    const blob = new Blob([summary.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${document?.filename || 'document'}-summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={goBack} size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Document
              </Button>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h1 className="text-xl font-bold text-neutral-800">AI Summary</h1>
              </div>
            </div>
            <div className="text-sm text-neutral-600">
              {document?.filename}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Generate Summary Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
              Document Summary
            </CardTitle>
            <CardDescription>
              Generate an AI-powered summary of your document using local Ollama phi model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleGenerateSummary}
                disabled={generateSummaryMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {generateSummaryMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {summary ? "Regenerate Summary" : "Generate Summary"}
              </Button>
              
              {summary && (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => copyToClipboard(summary.content)}
                    size="sm"
                  >
                    {copiedSummary ? (
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copy
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={downloadSummary}
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </div>
            
            {generateSummaryMutation.isPending && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">Generating summary...</p>
                    <p className="text-xs text-purple-600">This may take a few moments while AI processes your document</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Content */}
        {summaryLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-neutral-400 mx-auto mb-4 animate-spin" />
                <p className="text-neutral-500">Loading summary...</p>
              </div>
            </CardContent>
          </Card>
        ) : summary ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-neutral-800">Summary</CardTitle>
              <CardDescription>
                Generated on {new Date(summary.createdAt).toLocaleDateString()} at {new Date(summary.createdAt).toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-neutral max-w-none">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                  <div 
                    className="text-neutral-700 leading-relaxed whitespace-pre-wrap"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: '1.8' }}
                  >
                    {summary.content}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-neutral-200">
                <div className="flex items-center justify-between text-sm text-neutral-500">
                  <div>
                    Word count: {summary.content.split(' ').length} words
                  </div>
                  <div>
                    Generated by: Ollama Phi Model
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <FileText className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-800 mb-2">No Summary Yet</h3>
                <p className="text-neutral-500 mb-6">
                  Generate an AI-powered summary to quickly understand the key points of this document
                </p>
                <Button 
                  onClick={handleGenerateSummary}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate First Summary
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {summary.content.split(' ').length}
                </div>
                <p className="text-sm text-neutral-600">Words in Summary</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {document?.extractedText ? Math.round((summary.content.split(' ').length / document.extractedText.split(' ').length) * 100) : 0}%
                </div>
                <p className="text-sm text-neutral-600">Compression Ratio</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(summary.content.split(' ').length / 200)}
                </div>
                <p className="text-sm text-neutral-600">Est. Reading Time (min)</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}