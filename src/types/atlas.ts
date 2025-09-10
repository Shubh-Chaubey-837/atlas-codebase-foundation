// ATLAS Project Types

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'text' | 'audio' | 'video' | 'other';
  size: number;
  uploadedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'error';
  ocrText?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface AnalysisResult {
  id: string;
  documentId: string;
  type: 'sentiment' | 'entity_extraction' | 'classification' | 'summary';
  result: any;
  confidence: number;
  createdAt: Date;
}

export interface Dashboard {
  totalDocuments: number;
  processingQueue: number;
  completedAnalyses: number;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  type: 'upload' | 'process' | 'analyze' | 'export';
  description: string;
  timestamp: Date;
  status: 'success' | 'error' | 'pending';
}

export interface VisualizationData {
  labels: string[];
  values: number[];
  type: 'bar' | 'line' | 'pie' | 'scatter';
  metadata?: {
    title: string;
    description?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
  };
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}