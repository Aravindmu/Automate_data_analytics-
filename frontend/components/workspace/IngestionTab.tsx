'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { UploadCloud, Globe, Play, CheckCircle, FileText, Database, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Dataset } from '@/types';

export default function IngestionTab() {
  const { currentDataset, setCurrentDataset, datasets, setDatasets, setActiveTab, setCurrentProfile } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'api' | 'samples' | 'preview'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<{ columns: string[]; data: any[]; total_rows: number } | null>(null);

  // API Ingestion Form
  const [apiUrl, setApiUrl] = useState('');
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST'>('GET');
  const [apiName, setApiName] = useState('');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'api_key'>('none');
  const [apiToken, setApiToken] = useState('');
  const [jsonPath, setJsonPath] = useState('');
  const [apiTimeout, setApiTimeout] = useState(30);

  // Fetch dataset list on mount
  const refreshDatasets = async () => {
    try {
      const list = await api.getDatasets();
      setDatasets(list);
      if (!currentDataset && list.length > 0) {
        setCurrentDataset(list[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshDatasets();
  }, []);

  // Fetch preview when dataset changes or when preview tab opens
  useEffect(() => {
    if (currentDataset) {
      api.getDatasetPreview(currentDataset.id, 1, 25).then(res => {
        setPreviewData(res);
      }).catch(err => console.error(err));
    }
  }, [currentDataset]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ''));

    try {
      const newDataset: Dataset = await api.uploadDataset(formData);
      setCurrentDataset(newDataset);
      await refreshDatasets();
      setActiveSubTab('preview');
      // Auto-profile
      const prof = await api.getDatasetProfile(newDataset.id);
      setCurrentProfile(prof);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApiImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiUrl.trim() || !apiName.trim()) {
      alert('Please provide URL and Dataset Name.');
      return;
    }
    setIsUploading(true);
    try {
      const newDataset = await api.apiImportDataset({
        url: apiUrl,
        name: apiName,
        method: apiMethod,
        auth_type: authType,
        token: apiToken,
        json_path: jsonPath,
        timeout: apiTimeout,
      });
      setCurrentDataset(newDataset);
      await refreshDatasets();
      setActiveSubTab('preview');
      const prof = await api.getDatasetProfile(newDataset.id);
      setCurrentProfile(prof);
    } catch (err: any) {
      alert(`API Ingestion failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSampleLoad = async (type: 'housing' | 'churn') => {
    setIsUploading(true);
    try {
      let ds: Dataset;
      if (type === 'housing') {
        ds = await api.loadCaliforniaHousing();
      } else {
        ds = await api.loadCustomerChurn();
      }
      setCurrentDataset(ds);
      await refreshDatasets();
      setActiveSubTab('preview');
      const prof = await api.getDatasetProfile(ds.id);
      setCurrentProfile(prof);
    } catch (err: any) {
      alert(`Failed to load benchmark: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSubTab('upload')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
              activeSubTab === 'upload'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>File Upload</span>
          </button>

          <button
            onClick={() => setActiveSubTab('api')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
              activeSubTab === 'api'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>REST API Endpoint</span>
          </button>

          <button
            onClick={() => setActiveSubTab('samples')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
              activeSubTab === 'samples'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Benchmark Datasets</span>
          </button>

          {currentDataset && (
            <button
              onClick={() => setActiveSubTab('preview')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
                activeSubTab === 'preview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Dataset Preview</span>
            </button>
          )}
        </div>

        <button
          onClick={refreshDatasets}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh datasets"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 1. File Upload SubTab */}
      {activeSubTab === 'upload' && (
        <div className="space-y-6">
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileUpload(e.dataTransfer.files); }}
            className={`p-12 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 hover:border-blue-400'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              Drop your raw data file here
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
              Supported formats: <b>CSV (.csv)</b>, <b>Excel (.xlsx, .xls)</b>, <b>JSON (.json)</b>, and <b>Parquet (.parquet)</b>. Up to 100MB.
            </p>

            <label className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm cursor-pointer shadow-md hover:bg-blue-700 transition-all flex items-center space-x-2">
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing & Inspecting...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Browse File From Computer</span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls,.json,.parquet"
                onChange={(e) => handleFileUpload(e.target.files)}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>
      )}

      {/* 2. REST API SubTab */}
      {activeSubTab === 'api' && (
        <form onSubmit={handleApiImport} className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">REST API Ingestion Interface</h3>
            <p className="text-sm text-slate-500">Configure remote API endpoint with SSRF protection, credential security, and JSON path extraction.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Endpoint URL *</label>
              <input
                type="url"
                required
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.example.com/v1/records"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Dataset Name *</label>
              <input
                type="text"
                required
                value={apiName}
                onChange={(e) => setApiName(e.target.value)}
                placeholder="My API Ingested Dataset"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">HTTP Method</label>
              <select
                value={apiMethod}
                onChange={(e: any) => setApiMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Authentication Type</label>
              <select
                value={authType}
                onChange={(e: any) => setAuthType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
              >
                <option value="none">None / Public API</option>
                <option value="bearer">Bearer Token</option>
                <option value="api_key">API Key Header</option>
              </select>
            </div>

            {authType !== 'none' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">API Token / Secret Key (Masked)</label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Enter token..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Nested JSON Path (Optional)</label>
              <input
                type="text"
                value={jsonPath}
                onChange={(e) => setJsonPath(e.target.value)}
                placeholder="e.g. data.items"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Timeout (Seconds)</label>
              <input
                type="number"
                min={5}
                max={60}
                value={apiTimeout}
                onChange={(e) => setApiTimeout(parseInt(e.target.value) || 30)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              disabled={isUploading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md hover:bg-blue-700 transition-all flex items-center space-x-2"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              <span>{isUploading ? 'Executing API Ingestion...' : 'Fetch & Ingest API Data'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. Benchmark Samples SubTab */}
      {activeSubTab === 'samples' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 mb-3">
                Regression Benchmark
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">California Housing Prices</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Real benchmark dataset with 20,640 records and 9 features including median income, house age, average rooms, coordinates, and continuous target <b>MedianHouseValue</b>.
              </p>
            </div>
            <button
              onClick={() => handleSampleLoad('housing')}
              disabled={isUploading}
              className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>1-Click Load & Profile Dataset</span>
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 mb-3">
                Classification Benchmark
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Bank Customer Churn</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                2,500 bank customer observations with CreditScore, Geography, Gender, Balance, Products, and binary churn target <b>Exited (0/1)</b>.
              </p>
            </div>
            <button
              onClick={() => handleSampleLoad('churn')}
              disabled={isUploading}
              className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>1-Click Load & Profile Dataset</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Preview SubTab */}
      {activeSubTab === 'preview' && previewData && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{currentDataset?.name} (v{currentDataset?.version})</h3>
              <p className="text-xs text-slate-500">{previewData.total_rows.toLocaleString()} total rows • {previewData.columns.length} columns</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setActiveTab('inspection')}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700 transition-colors flex items-center space-x-1.5"
              >
                <span>Proceed to Step 2: Inspection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 font-bold text-slate-500">#</th>
                    {previewData.columns.map((c) => (
                      <th key={c} className="p-3 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                  {previewData.data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-slate-400 font-sans">{idx + 1}</td>
                      {previewData.columns.map((col) => (
                        <td key={col} className="p-3 text-slate-800 dark:text-slate-300 whitespace-nowrap">
                          {row[col] === null || row[col] === undefined ? (
                            <span className="text-red-400 font-sans italic">null</span>
                          ) : (
                            String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
