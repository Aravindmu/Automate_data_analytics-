'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { Sparkles, Play, CheckCircle, RefreshCw, Loader2, ArrowRight, Layers, FileDiff } from 'lucide-react';
import { Dataset } from '@/types';

export default function CleaningTab() {
  const { currentDataset, setCurrentDataset, setDatasets, setActiveTab, setCurrentProfile } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<'config' | 'diff'>('config');
  const [loading, setLoading] = useState(false);
  const [auditReport, setAuditReport] = useState<any | null>(null);
  const [previewRecords, setPreviewRecords] = useState<any[]>([]);

  // Cleaning Configurations
  const [cleanColNames, setCleanColNames] = useState(true);
  const [stripWhitespace, setStripWhitespace] = useState(true);
  const [handlePlaceholders, setHandlePlaceholders] = useState(true);

  const [enableDuplicates, setEnableDuplicates] = useState(true);

  const [enableMissing, setEnableMissing] = useState(true);
  const [numStrategy, setNumStrategy] = useState<'median' | 'mean' | 'constant' | 'knn'>('median');
  const [catStrategy, setCatStrategy] = useState<'mode' | 'missing_token' | 'constant'>('mode');

  const [enableOutliers, setEnableOutliers] = useState(true);
  const [outlierMethod, setOutlierMethod] = useState<'iqr' | 'zscore' | 'isolation_forest'>('iqr');
  const [outlierAction, setOutlierAction] = useState<'winsorize' | 'remove' | 'keep'>('winsorize');

  const [enableDatetime, setEnableDatetime] = useState(true);

  if (!currentDataset) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">No dataset selected</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">Please ingest a dataset to begin cleaning operations.</p>
        <button onClick={() => setActiveTab('ingestion')} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md">
          Go to Ingestion
        </button>
      </div>
    );
  }

  const buildConfig = () => ({
    string_normalization: {
      enabled: true,
      clean_column_names: cleanColNames,
      strip_whitespace: stripWhitespace,
      handle_placeholders: handlePlaceholders,
    },
    duplicates: {
      enabled: enableDuplicates,
      keep: 'first',
    },
    missing_values: {
      enabled: enableMissing,
      numeric_strategy: numStrategy,
      categorical_strategy: catStrategy,
    },
    outliers: {
      enabled: enableOutliers,
      method: outlierMethod,
      action: outlierAction,
    },
    datetime: {
      enabled: enableDatetime,
      extract_features: true,
    },
  });

  const handlePreviewCleaning = async () => {
    setLoading(true);
    try {
      const config = buildConfig();
      const res = await api.previewCleaning(currentDataset.id, config);
      setAuditReport(res.audit);
      setPreviewRecords(res.preview_records);
    } catch (err: any) {
      alert(`Cleaning preview failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCleaning = async () => {
    if (!confirm('This will execute cleaning transformations and generate a new version of the dataset, preserving original data. Proceed?')) {
      return;
    }
    setLoading(true);
    try {
      const config = buildConfig();
      const res = await api.executeCleaning(currentDataset.id, config);
      const newDataset: Dataset = res.new_dataset;
      setCurrentDataset(newDataset);
      setAuditReport(res.audit);
      const datasetsList = await api.getDatasets();
      setDatasets(datasetsList);

      // Re-profile the cleaned version
      const prof = await api.getDatasetProfile(newDataset.id);
      setCurrentProfile(prof);

      alert(`Success! Created cleaned dataset version v${newDataset.version}`);
    } catch (err: any) {
      alert(`Cleaning execution failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Automated Data Cleaning & Quality Studio</h2>
          <p className="text-sm text-slate-500">Configurable cleaning engine with reproducible version tracking for {currentDataset.name} (v{currentDataset.version})</p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={api.getDatasetDownloadUrl(currentDataset.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5"
            title="Download Cleaned Dataset"
          >
            <span>Download Cleaned Dataset</span>
          </a>
          <button
            onClick={() => setActiveSubTab(activeSubTab === 'config' ? 'diff' : 'config')}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center space-x-2"
          >
            <FileDiff className="w-4 h-4 text-blue-500" />
            <span>{activeSubTab === 'config' ? 'Version History & Diff' : 'Cleaning Configurations'}</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Cleaning Configuration Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. String Normalization */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-base">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                <span>String Normalization & Name Sanitization</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <label className="flex items-center space-x-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    checked={cleanColNames}
                    onChange={(e) => setCleanColNames(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>snake_case Column Names</span>
                </label>
                <label className="flex items-center space-x-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    checked={stripWhitespace}
                    onChange={(e) => setStripWhitespace(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Strip Text Whitespace</span>
                </label>
                <label className="flex items-center space-x-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    checked={handlePlaceholders}
                    onChange={(e) => setHandlePlaceholders(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Nullify '?' & 'NA' Values</span>
                </label>
              </div>
            </div>

            {/* 2. Missing Values Imputation */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-base">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</span>
                  <span>Missing Value Management</span>
                </div>
                <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableMissing}
                    onChange={(e) => setEnableMissing(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Enable Imputation</span>
                </label>
              </div>

              {enableMissing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Numeric Columns Strategy</label>
                    <select
                      value={numStrategy}
                      onChange={(e: any) => setNumStrategy(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                    >
                      <option value="median">Median Imputation (Robust to outliers)</option>
                      <option value="mean">Mean Imputation</option>
                      <option value="constant">Constant (0)</option>
                      <option value="knn">KNN Imputation (5 nearest neighbors)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Categorical Columns Strategy</label>
                    <select
                      value={catStrategy}
                      onChange={(e: any) => setCatStrategy(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                    >
                      <option value="mode">Most Frequent Category (Mode)</option>
                      <option value="missing_token">Missing Category Token ("Missing")</option>
                      <option value="constant">Constant ("Unknown")</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Outlier Handling */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-base">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs">3</span>
                  <span>Outlier Detection & Capping</span>
                </div>
                <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableOutliers}
                    onChange={(e) => setEnableOutliers(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Enable Outlier Handling</span>
                </label>
              </div>

              {enableOutliers && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Detection Method</label>
                    <select
                      value={outlierMethod}
                      onChange={(e: any) => setOutlierMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                    >
                      <option value="iqr">Interquartile Range (IQR, 1.5x cutoff)</option>
                      <option value="zscore">Z-Score (|z| &gt; 3.0)</option>
                      <option value="isolation_forest">Isolation Forest (Multivariate Anomaly)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Applied Action</label>
                    <select
                      value={outlierAction}
                      onChange={(e: any) => setOutlierAction(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                    >
                      <option value="winsorize">Winsorize / Cap Values at Threshold</option>
                      <option value="remove">Remove Outlier Rows</option>
                      <option value="keep">Keep Outliers Untouched</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Duplicates & Datetime */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Duplicate Records</h4>
                  <p className="text-xs text-slate-500">Remove fully duplicated rows</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableDuplicates}
                  onChange={(e) => setEnableDuplicates(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4"
                />
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Temporal Features</h4>
                  <p className="text-xs text-slate-500">Extract year, month, day, weekend</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableDatetime}
                  onChange={(e) => setEnableDatetime(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4"
                />
              </div>
            </div>
          </div>

          {/* Right Col: Actions & Audit Summary */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-900/10 space-y-4">
              <h3 className="font-bold text-lg">Execute Operations</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Preview your configuration before committing. Applying creates a reproducible new version while leaving your original dataset intact.
              </p>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handlePreviewCleaning}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Preview Cleaning Audit</span>
                </button>

                <button
                  onClick={handleExecuteCleaning}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Apply & Create New Version</span>
                </button>
              </div>
            </div>

            {/* Audit Log Card */}
            {auditReport && (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-emerald-600 font-bold text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Audit Summary</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400">Rows:</span>
                    <div className="font-bold text-slate-900 dark:text-white">{auditReport.initial_shape[0]} &rarr; {auditReport.final_shape[0]}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400">Columns:</span>
                    <div className="font-bold text-slate-900 dark:text-white">{auditReport.initial_shape[1]} &rarr; {auditReport.final_shape[1]}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400">Missing Imputed:</span>
                    <div className="font-bold text-slate-900 dark:text-white">{auditReport.missing_values_imputed}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-400">Outliers Handled:</span>
                    <div className="font-bold text-slate-900 dark:text-white">{auditReport.outliers_modified}</div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">Actions Executed:</div>
                  {auditReport.operations_applied.map((op: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-1.5">
                      <span className="text-blue-500 font-bold">&bull;</span>
                      <span>{op}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Version History & Diff View */}
      {activeSubTab === 'diff' && (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Dataset Lineage & Version History</h3>
          <p className="text-sm text-slate-500">Every dataset modification generates a deterministic child version. The original remains unchanged.</p>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold uppercase">Active Version</span>
                <h4 className="font-bold text-slate-900 dark:text-white mt-1">{currentDataset.name} (Version {currentDataset.version})</h4>
                <p className="text-xs text-slate-500">{currentDataset.row_count} rows • {currentDataset.column_count} columns</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">Status: {currentDataset.processing_status}</span>
            </div>

            {currentDataset.cleaning_history && currentDataset.cleaning_history.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <h5 className="font-bold text-xs uppercase text-slate-400">Applied Transformations History:</h5>
                {currentDataset.cleaning_history.map((hist: any, i: number) => (
                  <div key={i} className="text-xs text-slate-600 dark:text-slate-300">
                    <pre className="p-2 rounded bg-slate-100 dark:bg-slate-900 overflow-x-auto text-[11px] font-mono">
                      {JSON.stringify(hist, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
