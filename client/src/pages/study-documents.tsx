import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  FileIcon, 
  Search, 
  Filter, 
  Download, 
  Eye,
  BookOpen,
  Target,
  Calendar,
  User,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface Document {
  id: number;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  unitId: number | null;
  uploadedAt: string;
  isCompleted?: boolean;
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  unitId: number;
  attachedFileName?: string;
  attachedFilePath?: string;
  attachedFileType?: string;
  status: string;
  deadline: string;
}

interface Unit {
  id: number;
  name: string;
  description: string;
  color: string;
}

export default function StudyDocumentsPage() {
  

  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'docx'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'unit'>('name');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();



  // Get query client for manual refetching
  const { refetch: refetchDocuments } = useQuery({
    queryKey: ['api', 'documents'],
    queryFn: async () => {
      const result = await fetch('/api/documents').then(res => res.json());
      return result;
    },
    enabled: false, // Don't run automatically
  });

  const { refetch: refetchAssignments } = useQuery({
    queryKey: ['api', 'assignments'],
    queryFn: async () => {
      const result = await fetch('/api/assignments').then(res => res.json());
      return result;
    },
    enabled: false, // Don't run automatically
  });

  const { refetch: refetchUnits } = useQuery({
    queryKey: ['api', 'units'],
    queryFn: async () => {
      const result = await fetch('/api/units').then(res => res.json());
      return result;
    },
    enabled: false, // Don't run automatically
  });

  const handleRefresh = async () => {
    await Promise.all([
      refetchDocuments(),
      refetchAssignments(),
      refetchUnits()
    ]);
  };

  // Fetch all data with aggressive refetching and polling for real-time updates
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['api', 'documents'],
    queryFn: async () => {
      const result = await fetch('/api/documents').then(res => res.json());
      return result;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
    staleTime: 0, // Always consider data stale to ensure fresh updates
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['api', 'assignments'],
    queryFn: async () => {
      const result = await fetch('/api/assignments').then(res => res.json());
      return result;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
    staleTime: 0, // Always consider data stale to ensure fresh updates
  });

  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['api', 'units'],
    queryFn: async () => {
      const result = await fetch('/api/units').then(res => res.json());
      return result;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
    staleTime: 0, // Always consider data stale to ensure fresh updates
  });

  const isLoading = docsLoading || assignmentsLoading || unitsLoading;
  





  
  const allDocuments = [
    // Unit documents
    ...documents.map(doc => {
      const unit = units.find(u => u.id === Number(doc.unitId));
      
      const result = {
        ...doc,
        fileType: doc.filename.split('.').pop()?.toLowerCase() || 'unknown',
        source: 'unit' as const,
        sourceName: unit?.name || 'Unknown Unit',
        sourceId: doc.unitId,
      };
      
      return result;
    }),
    // Assignment documents
    ...assignments
      .filter(assign => assign.attachedFilePath)
      .map(assign => ({
        id: assign.id + 10000, // Offset to avoid conflicts
        filename: assign.attachedFileName || 'Unknown',
        originalName: assign.attachedFileName || 'Unknown',
        fileType: assign.attachedFileType || 'application/octet-stream',
        fileSize: 0, // Assignment files don't have size info
        unitId: assign.unitId,
        uploadedAt: assign.deadline, // Use deadline as upload date
        source: 'assignment' as const,
        sourceName: assign.title,
        sourceId: assign.id,
        status: assign.status,
      }))
  ];


  
  const filteredDocuments = allDocuments
    .filter(doc => {
      const matchesSearch = doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           doc.sourceName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || 
                         (filterType === 'pdf' && doc.fileType.includes('pdf')) ||
                         (filterType === 'docx' && doc.fileType.includes('docx'));
      
      return matchesSearch && matchesType;
    });
  
    const sortedDocuments = filteredDocuments.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.originalName.localeCompare(b.originalName);
      case 'date':
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      case 'size':
        return (b.fileSize || 0) - (a.fileSize || 0);
      case 'unit':
        return a.sourceName.localeCompare(b.sourceName);
      default:
        return 0;
    }
  });

  const finalDocuments = sortedDocuments;

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileIcon className="w-5 h-5 text-red-500" />;
    if (fileType.includes('docx') || fileType.includes('doc')) return <FileText className="w-5 h-5 text-blue-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUnitColor = (unitId: number | null) => {
    if (!unitId) return 'bg-gray-100 text-gray-700';
    const unit = units.find(u => u.id === unitId);
    if (!unit) return 'bg-gray-100 text-gray-700';
    
    const colorMap: Record<string, string> = {
      'red': 'bg-red-100 text-red-700',
      'blue': 'bg-blue-100 text-blue-700',
      'green': 'bg-green-100 text-green-700',
      'yellow': 'bg-yellow-100 text-yellow-700',
      'purple': 'bg-purple-100 text-purple-700',
      'orange': 'bg-orange-100 text-orange-700',
    };
    
    return colorMap[unit.color] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading study documents...</p>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="container mx-auto p-6">


      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Documents</h1>
                          <div className="text-gray-600 flex items-center gap-2">
                  All PDF and DOCX files from your units and assignments in one place
                  <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Live Updates
                  </span>
                </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>

        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold">{allDocuments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
                                <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                              <FileIcon className="w-5 h-5 text-red-600" />
                              <div>
                                <p className="text-sm text-gray-600">PDF Files</p>
                                <p className="text-2xl font-bold">
                                  {allDocuments.filter(doc => doc.fileType.includes('pdf')).length}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">DOCX Files</p>
                <p className="text-2xl font-bold">
                  {allDocuments.filter(doc => doc.fileType.includes('docx')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Units</p>
                <p className="text-2xl font-bold">{units.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search documents by name or unit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* File Type Filter */}
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'pdf' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('pdf')}
              >
                PDF
              </Button>
              <Button
                variant={filterType === 'docx' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('docx')}
              >
                DOCX
              </Button>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Date</option>
              <option value="size">Sort by Size</option>
              <option value="unit">Sort by Unit</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Documents ({finalDocuments.length})</span>
            <Badge variant="secondary">
              {finalDocuments.length} of {allDocuments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {finalDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No documents found matching your criteria</p>
                </div>
              ) : (
                finalDocuments.map((doc) => (
                  <div
                    key={`${doc.source}-${doc.id}`}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* File Info */}
                    <div className="flex items-center space-x-4 flex-1">
                      {getFileIcon(doc.fileType)}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {doc.originalName}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(doc.uploadedAt)}</span>
                          </span>
                          {doc.fileSize > 0 && (
                            <span>{formatFileSize(doc.fileSize)}</span>
                          )}
                          <Badge 
                            variant="outline" 
                            className={getUnitColor(doc.unitId)}
                          >
                            {doc.sourceName}
                          </Badge>
                          <Badge variant={doc.source === 'unit' ? 'default' : 'secondary'}>
                            {doc.source === 'unit' ? 'Unit' : 'Assignment'}
                          </Badge>
                          {doc.source === 'assignment' && (
                            <Badge variant={doc.status === 'completed' ? 'default' : 'outline'}>
                              {doc.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (doc.source === 'unit') {
                            setLocation(`/documents/${doc.id}`);
                          } else {
                            // For assignment documents, navigate to assignment view
                            setLocation(`/assignments/${doc.sourceId}/view`);
                          }
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Download functionality would go here
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 