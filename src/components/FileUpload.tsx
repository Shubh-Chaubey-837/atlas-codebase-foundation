import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Image, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AtlasAPI from '@/services/api';
import { Document } from '@/types/atlas';

interface FileUploadProps {
  onUploadComplete?: (documents: Document[]) => void;
}

export const FileUpload = ({ onUploadComplete }: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ file: string; success: boolean; error?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain'];
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB limit
    });

    if (validFiles.length !== selectedFiles.length) {
      toast({
        title: "Invalid files detected",
        description: "Some files were skipped. Only PDF, JPG, PNG, and TXT files under 10MB are allowed.",
        variant: "destructive",
      });
    }

    setFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadResults([]);
    const results: { file: string; success: boolean; error?: string }[] = [];
    const uploadedDocs: Document[] = [];

    try {
      for (const file of files) {
        try {
          const response = await AtlasAPI.uploadDocument(file);
          if (response.success && response.data) {
            results.push({ file: file.name, success: true });
            uploadedDocs.push(response.data);
          } else {
            results.push({ file: file.name, success: false, error: response.error });
          }
        } catch (error) {
          results.push({ file: file.name, success: false, error: 'Upload failed' });
        }
      }

      setUploadResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast({
          title: `${successCount} file(s) uploaded successfully`,
          description: failCount > 0 ? `${failCount} file(s) failed to upload` : undefined,
        });
        
        if (onUploadComplete) {
          onUploadComplete(uploadedDocs);
        }
      }

      if (failCount === files.length) {
        toast({
          title: "Upload failed",
          description: "All files failed to upload. Please try again.",
          variant: "destructive",
        });
      }

    } catch (error) {
      toast({
        title: "Upload error",
        description: "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setUploadResults([]);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (type.includes('image')) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose Files
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            PDF, JPG, PNG, TXT files up to 10MB
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Selected Files ({files.length})</h4>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.type)}
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Upload Results</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {uploadResults.map((result, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm truncate flex-1">{result.file}</span>
                  {result.error && (
                    <span className="text-xs text-red-500">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button 
          onClick={handleUpload} 
          disabled={files.length === 0 || uploading}
          className="w-full"
        >
          {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
        </Button>
      </CardContent>
    </Card>
  );
};