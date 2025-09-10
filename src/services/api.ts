import { APIResponse, Document, AnalysisResult } from '@/types/atlas';
import { supabase } from '@/lib/supabase';

export class AtlasAPI {
  // Document Management
  static async uploadDocument(file: File, userId?: string): Promise<APIResponse<Document>> {
    const formData = new FormData();
    formData.append('file', file);
    if (userId) formData.append('user_id', userId);
    
    try {
      // Call the Supabase Edge Function using the client
      const { data, error } = await supabase.functions.invoke('documents-upload', {
        body: formData,
      });
      
      console.log('Upload response:', data, error);
      
      if (error) {
        console.error('Upload failed:', error);
        throw new Error(error.message || 'Upload failed');
      }
      
      if (data && data.success) {
        const document: Document = {
          id: data.file_id.toString(),
          name: file.name,
          type: data.file_type as 'pdf' | 'image' | 'text',
          size: data.bytes,
          uploadedAt: new Date(),
          status: data.extracted_text ? 'completed' : 'pending',
          ocrText: data.extracted_text || undefined,
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

  static async getDocuments(): Promise<APIResponse<Document[]>> {
    try {
      // For now, return empty array until we implement document fetching
      return {
        success: true,
        data: []
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