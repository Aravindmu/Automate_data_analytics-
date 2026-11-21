const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = {
    ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.error || errorJson.detail || JSON.stringify(errorJson);
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Projects
  getProjects: async () => {
    const res = await request<any>('/projects/');
    return Array.isArray(res) ? res : (res?.results || []);
  },
  createProject: (data: { name: string; description?: string }) => request<any>('/projects/', { method: 'POST', body: JSON.stringify(data) }),

  // Datasets
  getDatasets: async () => {
    const res = await request<any>('/datasets/');
    return Array.isArray(res) ? res : (res?.results || []);
  },
  getDataset: (id: string) => request<any>(`/datasets/${id}/`),
  uploadDataset: (formData: FormData) => request<any>('/datasets/upload/', { method: 'POST', body: formData }),
  apiImportDataset: (data: any) => request<any>('/datasets/api-import/', { method: 'POST', body: JSON.stringify(data) }),
  getDatasetPreview: (id: string, page = 1, pageSize = 50) => request<any>(`/datasets/${id}/preview/?page=${page}&page_size=${pageSize}`),
  getDatasetSchema: (id: string) => request<any>(`/datasets/${id}/schema/`),
  getDatasetDownloadUrl: (id: string) => `${API_BASE_URL}/datasets/${id}/download/`,

  // Data Quality & Cleaning
  getDatasetProfile: (id: string) => request<any>(`/data-quality/${id}/profile/`, { method: 'POST' }),
  previewCleaning: (id: string, config: any) => request<any>(`/data-quality/${id}/clean-preview/`, { method: 'POST', body: JSON.stringify({ config }) }),
  executeCleaning: (id: string, config: any) => request<any>(`/data-quality/${id}/clean/`, { method: 'POST', body: JSON.stringify({ config }) }),
  getDatasetDiff: (id: string) => request<any>(`/data-quality/${id}/diff/`),

  // EDA Studio
  generateChart: (datasetId: string, chartConfig: any) => request<any>(`/eda/${datasetId}/chart/`, { method: 'POST', body: JSON.stringify(chartConfig) }),
  getChartGallery: (datasetId: string) => request<{ suggestions: any[] }>(`/eda/${datasetId}/gallery/`),
  getEDASummary: (datasetId: string) => request<any>(`/eda/${datasetId}/summary/`),

  // Feature Engineering & Extraction & Selection
  previewFeatureEngineering: (datasetId: string, config: any) => request<any>(`/feature-engineering/${datasetId}/preview/`, { method: 'POST', body: JSON.stringify({ config }) }),
  applyFeatureEngineering: (datasetId: string, config: any) => request<any>(`/feature-engineering/${datasetId}/apply/`, { method: 'POST', body: JSON.stringify({ config }) }),
  getFeatureImportance: (datasetId: string, targetColumn: string, problemType = 'auto') => request<any>(`/feature-engineering/${datasetId}/importance/`, { method: 'POST', body: JSON.stringify({ target_column: targetColumn, problem_type: problemType }) }),
  extractFeatures: (datasetId: string, config: any, apply = false) => request<any>(`/feature-engineering/${datasetId}/extract/`, { method: 'POST', body: JSON.stringify({ config, apply }) }),
  selectFeatures: (datasetId: string, config: any, apply = false) => request<any>(`/feature-engineering/${datasetId}/select/`, { method: 'POST', body: JSON.stringify({ config, apply }) }),

  // Machine Learning & AutoML
  getAvailableModels: (problemType: string) => request<{ problem_type: string; models: any[] }>(`/models/available/?problem_type=${problemType}`),
  trainModels: (datasetId: string, config: any) => request<any>('/models/train/', { method: 'POST', body: JSON.stringify({ dataset_id: datasetId, config }) }),
  checkLeakage: (datasetId: string, targetColumn: string, problemType = 'auto') => request<any>('/models/leakage-check/', { method: 'POST', body: JSON.stringify({ dataset_id: datasetId, target_column: targetColumn, problem_type: problemType }) }),
  getModelSchema: (experimentId: string) => request<any>(`/models/${experimentId}/schema/`),
  predict: (experimentId: string, inputs: Record<string, any>) => request<any>(`/models/${experimentId}/predict/`, { method: 'POST', body: JSON.stringify({ inputs }) }),
  getSampleInput: (experimentId: string) => request<any>(`/models/${experimentId}/sample-input/`),

  // Model Intelligence
  getExplainability: (experimentId: string) => request<any>(`/models/${experimentId}/explainability/`, { method: 'POST' }),
  getModelDiagnostics: (experimentId: string) => request<any>(`/models/${experimentId}/diagnostics/`),
  getErrorAnalysis: (experimentId: string) => request<any>(`/models/${experimentId}/error-analysis/`),
  whatIfSimulation: (experimentId: string, data: any) => request<any>(`/models/${experimentId}/what-if/`, { method: 'POST', body: JSON.stringify(data) }),

  // Experiments
  getExperiments: async (datasetId?: string) => {
    const res = await request<any>(`/experiments/${datasetId ? `?dataset_id=${datasetId}` : ''}`);
    return Array.isArray(res) ? res : (res?.results || []);
  },
  getExperiment: (id: string) => request<any>(`/experiments/${id}/`),
  getModelArtifactUrl: (id: string) => `${API_BASE_URL}/experiments/${id}/download-model/`,

  // Reports
  getPDFReportUrl: (datasetId: string) => `${API_BASE_URL}/reports/${datasetId}/pdf/`,
  getExcelReportUrl: (datasetId: string) => `${API_BASE_URL}/reports/${datasetId}/excel/`,
  getJSONSummary: (datasetId: string) => request<any>(`/reports/${datasetId}/json/`),

  // Sample Datasets
  getAvailableSamples: () => request<any[]>('/samples/available/'),
  loadCaliforniaHousing: () => request<any>('/samples/load-california-housing/', { method: 'POST' }),
  loadCustomerChurn: () => request<any>('/samples/load-customer-churn/', { method: 'POST' }),
};
