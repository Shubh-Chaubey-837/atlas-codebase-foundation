import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Document } from '@/types/atlas';
import AtlasAPI from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Search, File, Calendar, HardDrive, Tag, Home, ArrowLeft } from 'lucide-react';

interface DashboardProps {
  className?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ className = '' }) => {
  const [files, setFiles] = useState<Document[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
    has_more: false
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch files on component mount and when search/pagination changes
  useEffect(() => {
    fetchFiles();
  }, [searchQuery, pagination.offset]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await AtlasAPI.getFiles({
        limit: pagination.limit,
        offset: pagination.offset,
        search: searchQuery || undefined
      });

      if (response.success) {
        setFiles(response.data.files);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          has_more: response.data.pagination.has_more
        }));
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to fetch files",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to fetch files",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const file of Array.from(selectedFiles)) {
        try {
          const response = await AtlasAPI.uploadDocument(file);
          if (response.success) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to upload ${file.name}:`, response.error);
          }
        } catch (error) {
          failCount++;
          console.error(`Upload error for ${file.name}:`, error);
        }
      }

      if (successCount > 0) {
        toast({
          title: "Upload successful",
          description: `${successCount} file(s) uploaded successfully`,
        });
        
        // Clear selected files and refresh file list
        setSelectedFiles(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Reset to first page and refresh
        setPagination(prev => ({ ...prev, offset: 0 }));
        await fetchFiles();
      }

      if (failCount > 0) {
        toast({
          title: failCount === selectedFiles.length ? "Upload failed" : "Partial upload failure",
          description: `${failCount} file(s) failed to upload`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "An error occurred during upload",
        variant: "destructive",
      });
    }
    
    setUploading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, offset: 0 }));
    // fetchFiles will be called by useEffect when pagination.offset changes
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Reset to first page when search changes
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getFileIcon = (type: string) => {
    return <File className="h-4 w-4" />;
  };

  const loadMore = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  return (
    <div className={`container mx-auto p-6 space-y-6 ${className}`}>
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <div className="h-6 w-px bg-border" />
          <Badge variant="outline">Project ATLAS</Badge>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Document Dashboard</h1>
        
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.txt"
                className="flex-1"
              />
              <Button 
                onClick={handleUpload}
                disabled={!selectedFiles || selectedFiles.length === 0 || uploading}
                className="sm:w-auto"
              >
                {uploading ? 'Uploading...' : `Upload ${selectedFiles?.length || 0} File(s)`}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Supported formats: PDF, JPG, PNG, TXT (max 10MB per file)
            </p>
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search files by name or content..."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={loading}>
                Search
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Files Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Files ({pagination.total})</span>
            {loading && <span className="text-sm font-normal">Loading...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? 'Loading files...' : searchQuery ? 'No files found matching your search.' : 'No files uploaded yet.'}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Files Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {files.map((file) => (
                  <Card key={file.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* File Header */}
                        <div className="flex items-start gap-3">
                          {getFileIcon(file.type)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate" title={file.name}>
                              {file.name}
                            </h3>
                            <Badge variant={file.status === 'completed' ? 'default' : 'secondary'}>
                              {file.status}
                            </Badge>
                          </div>
                        </div>

                        {/* File Details */}
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-3 w-3" />
                            <span>{formatFileSize(file.size)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(file.uploadedAt)}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        {file.tags && file.tags.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Tag className="h-3 w-3" />
                              <span>Tags:</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {file.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Content Preview */}
                        {file.ocrText && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {file.ocrText}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Load More Button */}
              {pagination.has_more && (
                <div className="text-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;