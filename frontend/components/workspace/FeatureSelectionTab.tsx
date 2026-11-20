'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { Filter, Trash2, CheckSquare, Square, Play, Sparkles, Loader2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Dataset } from '@/types';

export default function FeatureSelectionTab() {
  const { currentDataset, setCurrentDataset, currentProfile, setDatasets, setActiveTab, setCurrentProfile } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  const [targetCol, setTargetCol] = useState<string>('');
  const [dropLowVariance, setDropLowVariance] = useState<boolean>(true);
  const [varianceThreshold, setVarianceThreshold] = useState<number>(0.01);
  const [dropHighCorrelation, setDropHighCorrelation] = useState<boolean>(true);
  const [correlationThreshold, setCorrelationThreshold] = useState<number>(0.92);
  const [selectKBest, setSelectKBest] = useState<number>(0);
  const [explicitDrops, setExplicitDrops] = useState<string[]>([]);

  const columns = currentProfile?.profiling?.columns || [];
  const numericColumns = columns.filter(c => c.dtype_group === 'numeric').map(c => c.name);

  // Initialize target column
  useEffect(() => {
    if (columns.length > 0 && !targetCol) {
      setTargetCol(columns[columns.length - 1].name);
    }
  }, [columns]);

  const toggleExplicitDrop = (col: string) => {
    if (explicitDrops.includes(col)) {
      setExplicitDrops(explicitDrops.filter(c => c !== col));
    } else {
      setExplicitDrops([...explicitDrops, col]);
    }
  };

  const handleRunAnalysis = async () => {
    if (!currentDataset) return;
    setAnalyzing(true);
    try {
      const config = {
        target_column: targetCol,
        variance_threshold: varianceThreshold,
        correlation_threshold: correlationThreshold,
      };
      const res = await api.selectFeatures(currentDataset.id, config, false);
      setAnalysisResult(res);
    } catch (err: any) {
      alert(`Feature selection analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplySelection = async () => {
    if (!currentDataset) return;
    setLoading(true);
    try {
      const config = {
        target_column: targetCol,
        drop_low_variance: dropLowVariance,
        variance_threshold: varianceThreshold,
        drop_high_correlation: dropHighCorrelation,
        correlation_threshold: correlationThreshold,
        select_k_best: selectKBest > 0 ? selectKBest : null,
        drop_features: explicitDrops
      };

      const res = await api.selectFeatures(currentDataset.id, config, true);
      const newDataset: Dataset = res.new_dataset;
      setCurrentDataset(newDataset);
      const dList = await api.getDatasets();
      setDatasets(dList);
      const prof = await api.getDatasetProfile(newDataset.id);
      setCurrentProfile(prof);

      alert(`Selection applied! Retained ${res.report.remaining_features_count} features in v${newDataset.version}`);
    } catch (err: any) {
      alert(`Failed to apply feature selection: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!currentDataset) {
    return (
      <div className="p-8 text-center rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50]">
        <Filter className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-[#172033] dark:text-white">No dataset selected</h3>
        <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-1 mb-4">Please select a dataset to configure feature selection.</p>
        <button onClick={() => setActiveTab('ingestion')} className="px-4 py-2 rounded-lg bg-[#3157A4] text-white text-xs font-medium">
          Go to Ingestion
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E9F0] dark:border-[#2B3A50]">
        <div>
          <h2 className="text-lg font-semibold text-[#172033] dark:text-white">Feature Selection & Pruning Studio</h2>
          <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-0.5">
            Eliminate zero-variance, redundant collinear, and uninformative features to reduce curse of dimensionality
          </p>
        </div>

        <button
          onClick={() => setActiveTab('leakage_check')}
          className="px-3.5 py-1.5 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white text-xs font-medium shadow-xs transition-colors flex items-center space-x-1.5"
        >
          <span>Next: Data Leakage Check</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Controls & Analysis */}
        <div className="lg:col-span-2 space-y-4">
          {/* Target Selector Card */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#172033] dark:text-white">Target Column for Relevance Scoring:</span>
              <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0]">Computes mutual information relevance against this objective</p>
            </div>
            <select
              value={targetCol}
              onChange={(e) => setTargetCol(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
            >
              {columns.map(c => <option key={c.name} value={c.name} className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">{c.name}</option>)}
            </select>
          </div>

          {/* Filtering Criteria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Variance Threshold */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#172033] dark:text-white">Variance Threshold</span>
                <input
                  type="checkbox"
                  checked={dropLowVariance}
                  onChange={(e) => setDropLowVariance(e.target.checked)}
                  className="rounded text-[#3157A4]"
                />
              </div>
              <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0]">
                Removes features with variance below {varianceThreshold}.
              </p>
              <input
                type="range"
                min="0.0"
                max="0.1"
                step="0.005"
                value={varianceThreshold}
                onChange={(e) => setVarianceThreshold(parseFloat(e.target.value))}
                className="w-full accent-[#3157A4]"
              />
              <div className="text-[11px] text-right font-mono text-[#3157A4] font-semibold">
                Threshold: {varianceThreshold}
              </div>
            </div>

            {/* Collinearity Filter */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#172033] dark:text-white">Collinearity Filter</span>
                <input
                  type="checkbox"
                  checked={dropHighCorrelation}
                  onChange={(e) => setDropHighCorrelation(e.target.checked)}
                  className="rounded text-[#3157A4]"
                />
              </div>
              <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0]">
                Drops redundant feature if correlation exceeds {correlationThreshold}.
              </p>
              <input
                type="range"
                min="0.80"
                max="0.99"
                step="0.01"
                value={correlationThreshold}
                onChange={(e) => setCorrelationThreshold(parseFloat(e.target.value))}
                className="w-full accent-[#3157A4]"
              />
              <div className="text-[11px] text-right font-mono text-[#3157A4] font-semibold">
                Max Corr: {correlationThreshold}
              </div>
            </div>
          </div>

          {/* SelectKBest Top N features */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#172033] dark:text-white">Select Top-K Most Informative Features</span>
                <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0]">
                  Retains only the highest-scoring features based on Mutual Information (0 = keep all).
                </p>
              </div>
              <input
                type="number"
                min="0"
                max={numericColumns.length}
                value={selectKBest}
                onChange={(e) => setSelectKBest(parseInt(e.target.value) || 0)}
                className="w-20 px-2 py-1 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] text-xs font-mono text-center"
              />
            </div>
          </div>

          {/* Run Analysis Button */}
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="w-full py-2.5 rounded-lg bg-[#F5F7FA] dark:bg-[#1D2B40] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-white text-xs font-medium border border-[#E5E9F0] dark:border-[#2B3A50] transition-colors flex items-center justify-center space-x-1.5"
          >
            {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-[#3157A4]" />}
            <span>Analyze Feature Redundancy & Rankings</span>
          </button>

          {/* Analysis Results View */}
          {analysisResult && (
            <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A0AEC0]">
                Diagnostic Findings
              </div>

              {/* Collinear Pairs */}
              {analysisResult.collinear_pairs && analysisResult.collinear_pairs.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Collinear Feature Pairs Detected:</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {analysisResult.collinear_pairs.map((p: any, idx: number) => (
                      <div key={idx} className="p-2 rounded-lg bg-[#F5F7FA] dark:bg-[#1D2B40] flex justify-between items-center text-[11px]">
                        <span><b>{p.feature_a}</b> &harr; <b>{p.feature_b}</b></span>
                        <span className="font-mono text-[#D94F54] font-bold">r = {p.correlation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#16865D] flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>No severe collinear pairs found above {correlationThreshold}.</span>
                </div>
              )}

              {/* Relevance Rankings */}
              {analysisResult.relevance_rankings && analysisResult.relevance_rankings.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[#E5E9F0] dark:border-[#2B3A50]">
                  <span className="text-xs font-semibold text-[#172033] dark:text-white block">Top Informative Features:</span>
                  <div className="space-y-1 text-xs">
                    {analysisResult.relevance_rankings.slice(0, 5).map((r: any, idx: number) => (
                      <div key={r.feature} className="flex justify-between items-center text-[11px]">
                        <span className="text-[#172033] dark:text-[#F1F5F9] font-medium">{idx + 1}. {r.feature}</span>
                        <span className="font-mono text-[#3157A4] font-bold">MI: {r.mutual_info}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Pruning Checklist & Execution */}
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#172033] dark:text-white">Manual Drop List</span>
              <span className="text-[11px] text-[#667085]">{explicitDrops.length} marked to drop</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1 text-xs">
              {columns.filter(c => c.name !== targetCol).map((col) => {
                const isMarked = explicitDrops.includes(col.name);
                return (
                  <div
                    key={col.name}
                    onClick={() => toggleExplicitDrop(col.name)}
                    className="p-1.5 rounded-lg hover:bg-[#F5F7FA] dark:hover:bg-[#1D2B40] cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span className={`text-[11px] ${isMarked ? 'line-through text-[#D94F54] font-semibold' : 'text-[#172033] dark:text-slate-300'}`}>
                      {col.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{col.dtype_group}</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleApplySelection}
              disabled={loading}
              className="w-full mt-3 py-2.5 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white text-xs font-medium shadow-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Apply Selection & Create Dataset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
