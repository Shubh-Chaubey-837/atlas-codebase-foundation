import { APIResponse, Document, AnalysisResult } from '@/types/atlas';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase-config';

export class AtlasAPI {
  // Document Management
  static async uploadDocument(file: File, userId?: string): Promise<APIResponse<Document>> {
    const formData = new FormData();
    formData.append('file', file);
    if (userId) formData.append('user_id', userId);
    
    try {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase URL/Anon Key missing. Set them in src/lib/supabase-config.ts');
      }

      const url = `${SUPABASE_URL}/functions/v1/documents-upload`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
          // Do not set Content-Type when sending FormData
        } as any,
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Upload failed:', response.status, text);
        throw new Error(text || `Upload failed: ${response.status}`);
      }

      const data = await response.json();

      console.log('Upload response:', data);

      if (data && data.success) {
        const document: Document = {
          id: data.file_id.toString(),
          name: file.name,
          type: data.file_type as 'pdf' | 'image' | 'text',
          size: data.bytes,
          uploadedAt: new Date(),
          status: data.extracted ? 'completed' : 'pending',
          ocrText: undefined,
        };
        
        return {
          success: true,
          data: document,
          message: 'Document uploaded successfully'
        };
      } else {
        throw new Error(data?.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document'
      };
    }
  }

  static async getFiles(params?: { limit?: number; offset?: number; search?: string }): Promise<APIResponse<{ files: Document[]; pagination: any; search_query?: string }>> {
    try {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase URL/Anon Key missing. Set them in src/lib/supabase-config.ts');
      }

      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());  
      if (params?.search) searchParams.set('search', params.search);

      const url = `${SUPABASE_URL}/functions/v1/files?${searchParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Files fetch failed:', response.status, text);
        throw new Error(text || `Files fetch failed: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.success) {
        const documents: Document[] = data.files.map((file: any) => ({
          id: file.id.toString(),
          name: file.filename,
          type: file.file_type as 'pdf' | 'image' | 'text',
          size: file.size,
          uploadedAt: new Date(file.upload_date),
          status: file.has_content ? 'completed' : 'pending',
          ocrText: file.content_preview || undefined,
          tags: file.tags || []
        }));
        
        return {
          success: true,
          data: {
            files: documents,
            pagination: data.pagination,
            search_query: data.search_query
          }
        };
      } else {
        throw new Error(data?.error || 'Failed to fetch files');
      }
    } catch (error) {
      console.error('Files fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch files'
      };
    }
  }

  static async getDocuments(): Promise<APIResponse<Document[]>> {
    try {
      const result = await this.getFiles();
      if (result.success) {
        return {
          success: true,
          data: result.data.files
        };
      }
      return {
        success: false,
        error: result.error || 'Failed to fetch documents'
      };
    } catch (error) {
      throw new Error('Failed to fetch documents');
    }
  }

  static async processDocument(documentId: string): Promise<APIResponse<void>> {
    try {
      // Placeholder for document processing
      return {
        success: true,
        message: 'Document processed'
      };
    } catch (error) {
      throw new Error('Failed to process document');
    }
  }

  // OCR Processing
  static async performOCR(documentId: string): Promise<APIResponse<string>> {
    try {
      // OCR is handled in the upload function
      return {
        success: true,
        data: 'OCR completed during upload'
      };
    } catch (error) {
      throw new Error('OCR processing failed');
    }
  }

  // Analytics
  static async analyzeDocument(documentId: string, analysisType: string): Promise<APIResponse<AnalysisResult>> {
    try {
      // Placeholder for analysis
      return {
        success: true,
        data: {
          id: '1',
          documentId,
          type: analysisType as any,
          result: {},
          confidence: 0.95,
          createdAt: new Date()
        }
      };
    } catch (error) {
      throw new Error('Document analysis failed');
    }
  }

  static async getAnalysisResults(documentId: string): Promise<APIResponse<AnalysisResult[]>> {
    try {
      return {
        success: true,
        data: []
      };
    } catch (error) {
      throw new Error('Failed to fetch analysis results');
    }
  }

  // Search functionality
  static async searchFiles(query: string): Promise<APIResponse<Document[]>> {
    try {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase URL/Anon Key missing. Set them in src/lib/supabase-config.ts');
      }

      const url = `${SUPABASE_URL}/functions/v1/search?q=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Search failed:', response.status, text);
        throw new Error(text || `Search failed: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.success) {
        const documents: Document[] = data.results.map((result: any) => ({
          id: result.id.toString(),
          name: result.filename,
          type: result.file_type as 'pdf' | 'image' | 'text',
          size: result.size,
          uploadedAt: new Date(result.upload_date),
          status: result.has_content ? 'completed' : 'pending',
          ocrText: result.content_preview || undefined,
        }));
        
        return {
          success: true,
          data: documents,
          message: `Found ${data.total_count} results for "${query}"`
        };
      } else {
        throw new Error(data?.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search files'
      };
    }
  }

  // Auto-tagging functionality
  static async autoTagFile(fileId: string): Promise<APIResponse<{ tags: string[], tag_count: number }>> {
    try {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase URL/Anon Key missing. Set them in src/lib/supabase-config.ts');
      }

      const url = `${SUPABASE_URL}/functions/v1/auto-tag-file`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_id: parseInt(fileId) }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Auto-tagging failed:', response.status, text);
        throw new Error(text || `Auto-tagging failed: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.success) {
        return {
          success: true,
          data: {
            tags: data.tags || [],
            tag_count: data.tag_count || 0
          },
          message: data.message || 'File auto-tagged successfully'
        };
      } else {
        throw new Error(data?.error || 'Auto-tagging failed');
      }
    } catch (error) {
      console.error('Auto-tagging error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to auto-tag file'
      };
    }
  }

  // Dashboard Data
  static async getDashboardData(): Promise<APIResponse<any>> {
    try {
      return {
        success: true,
        data: {
          totalDocuments: 0,
          processingQueue: 0,
          completedAnalyses: 0,
          recentActivity: []
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch dashboard data');
    }
  }
}

export default AtlasAPI;