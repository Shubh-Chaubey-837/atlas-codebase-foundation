import axios from 'axios';
import { APIResponse, Document, AnalysisResult } from '@/types/atlas';

// Configure axios with Supabase Edge Functions URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const api = axios.create({
  baseURL: `${SUPABASE_URL}/functions/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens
api.interceptors.request.use((config) => {
  // Add auth token when Supabase is configured
  // const token = getAuthToken();
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export class AtlasAPI {
  // Document Management
  static async uploadDocument(file: File, userId?: string): Promise<APIResponse<Document>> {
    const formData = new FormData();
    formData.append('file', file);
    if (userId) formData.append('user_id', userId);
    
    try {
      const response = await api.post('/documents-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      // Transform the Edge Function response to match our Document type
      const edgeResponse = response.data;
      if (edgeResponse.success) {
        const document: Document = {
          id: edgeResponse.file_id.toString(),
          name: file.name,
          type: edgeResponse.file_type as 'pdf' | 'image' | 'text',
          size: edgeResponse.bytes,
          uploadedAt: new Date(),
          status: edgeResponse.extracted ? 'completed' : 'pending',
          ocrText: edgeResponse.extracted ? 'Text extracted' : undefined,
        };
        
        return {
          success: true,
          data: document,
          message: 'Document uploaded successfully'
        };
      } else {
        throw new Error(edgeResponse.error || 'Upload failed');
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to upload document'
      };
    }
  }

  static async getDocuments(): Promise<APIResponse<Document[]>> {
    try {
      const response = await api.get('/documents');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch documents');
    }
  }

  static async processDocument(documentId: string): Promise<APIResponse<void>> {
    try {
      const response = await api.post(`/documents/${documentId}/process`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to process document');
    }
  }

  // OCR Processing
  static async performOCR(documentId: string): Promise<APIResponse<string>> {
    try {
      const response = await api.post(`/ocr/${documentId}`);
      return response.data;
    } catch (error) {
      throw new Error('OCR processing failed');
    }
  }

  // Analytics
  static async analyzeDocument(documentId: string, analysisType: string): Promise<APIResponse<AnalysisResult>> {
    try {
      const response = await api.post(`/analytics/${documentId}`, { type: analysisType });
      return response.data;
    } catch (error) {
      throw new Error('Document analysis failed');
    }
  }

  static async getAnalysisResults(documentId: string): Promise<APIResponse<AnalysisResult[]>> {
    try {
      const response = await api.get(`/analytics/${documentId}/results`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch analysis results');
    }
  }

  // Dashboard Data
  static async getDashboardData(): Promise<APIResponse<any>> {
    try {
      const response = await api.get('/dashboard');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch dashboard data');
    }
  }
}

export default AtlasAPI;