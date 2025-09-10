import axios from 'axios';
import { APIResponse, Document, AnalysisResult } from '@/types/atlas';

// Configure axios with Supabase URL (to be configured later)
const api = axios.create({
  baseURL: '/api', // This will be configured with Supabase Edge Functions
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
  static async uploadDocument(file: File): Promise<APIResponse<Document>> {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to upload document');
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