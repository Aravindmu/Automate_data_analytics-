'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { SlidersHorizontal, Plus, Sparkles, Play, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Dataset } from '@/types';

export default function FeatureEngineeringTab() {
  const { currentDataset, setCurrentDataset, currentProfile, setDatasets, setActiveTab, setCurrentProfile } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [importanceLoading, setImportanceLoading] = useState(false);
  const [importanceResults, setImportanceResults] = useState<any[]>([]);
  const [targetCol, setTargetCol] = useState<string>('');

  // Interactions
  const [col1, setCol1] = useState<string>('');
  const [col2, setCol2] = useState<string>('');
  const [operator, setOperator] = useState<'multiply' | 'add' | 'subtract' | 'divide'>('multiply');

  // Math transform
  const [transformCol, setTransformCol] = useState<string>('');
  const [transformType, setTransformType] = useState<'log1p' | 'sqrt' | 'power'>('log1p');

  // Binning
  const [binCol, setBinCol] = useState<string>('');
  const [nBins, setNBins] = useState<number>(5);

  const columns = currentProfile?.profiling?.columns || [];
  const numericColumns = columns.filter(c => c.dtype_group === 'numeric').map(c => c.name);

  const handleComputeImportance = async () => {
    if (!currentDataset || !targetCol) return;
    setImportanceLoading(true);
    try {
      const res = await api.getFeatureImportance(currentDataset.id, targetCol);
      setImportanceResults(res.features || []);
    } catch (err: any) {
      alert(`Importance calculation failed: ${err.message}`);
    } finally {
      setImportanceLoading(false);
    }
  };

  const handleApplyFE = async () => {
    if (!currentDataset) return;
    setLoading(true);
    try {
      const config: any = {
        interactions: col1 && col2 ? [{ col1, col2, operator }] : [],
        math_transforms: transformCol ? [{ column: transformCol, type: transformType }] : [],
        binning: binCol ? [{ column: binCol, bins: nBins, strategy: 'quantile' }] : []
      };

      const res = await api.applyFeatureEngineering(currentDataset.id, config);
      const newDataset: Dataset = res.new_dataset;
      setCurrentDataset(newDataset);
      const dList = await api.getDatasets();
      setDatasets(dList);

      const prof = await api.getDatasetProfile(newDataset.id);
      setCurrentProfile(prof);

      alert(`Feature engineering completed! Created dataset version v${newDataset.version}`);
    } catch (err: any) {
      alert(`Failed to apply feature engineering: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!currentDataset) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">No dataset selected</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">Please select a dataset to configure feature transformations.</p>
        <button onClick={() => setActiveTab('ingestion')} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md">
          Go to Ingestion
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Feature Engineering & Preprocessing Studio</h2>
          <p className="text-sm text-slate-500">Construct interaction terms, non-linear mathematical transforms, and assess mutual information ranking</p>
        </div>

        <button
          onClick={() => setActiveTab('feature_selection')}
          className="px-4 py-2 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white font-medium text-xs shadow-xs transition-colors flex items-center space-x-1.5"
        >
          <span>Proceed to Step 7: Feature Selection</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Transformation Builders */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Feature Interactions */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-base">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
              <span>Mathematical Feature Interaction</span>
            </div>
            <p className="text-xs text-slate-500">Synthesize compound features by applying arithmetic operations across two columns.</p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Column 1</label>
                <select
                  value={col1}
                  onChange={(e) => setCol1(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  <option value="">-- Select --</option>
                  {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Operator</label>
                <select
                  value={operator}
                  onChange={(e: any) => setOperator(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  <option value="multiply">&times; Multiply</option>
                  <option value="add">+ Add</option>
                  <option value="subtract">&minus; Subtract</option>
                  <option value="divide">&divide; Divide</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Column 2</label>
                <select
                  value={col2}
                  onChange={(e) => setCol2(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  <option value="">-- Select --</option>
                  {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Math Transforms */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-base">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</span>
              <span>Non-Linear Feature Transformations</span>
            </div>
            <p className="text-xs text-slate-500">Stabilize variance and normalize skewed distributions using mathematical transforms.</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Feature</label>
                <select
                  value={transformCol}
                  onChange={(e) => setTransformCol(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  <option value="">-- Select --</option>
                  {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Transformation Algorithm</label>
                <select
                  value={transformType}
                  onChange={(e: any) => setTransformType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  <option value="log1p">Log Transformation (log1p)</option>
                  <option value="sqrt">Square Root Transform (sqrt)</option>
                  <option value="power">Yeo-Johnson Power Transform</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Binning */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-base">
              <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs">3</span>
              <span>Discretization & Quantile Binning</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Continuous Feature</label>
                <select
                  value={binCol}
                  onChange={(e) => setBinCol(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  <option value="">-- Select --</option>
                  {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Quantile Intervals</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={nBins}
                  onChange={(e) => setNBins(parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleApplyFE}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Commit Engineered Features & Create Version</span>
          </button>
        </div>

        {/* Right Col: Feature Importance Assessor */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-base">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <span>Feature Relevance Ranking</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Computes Random Forest Gini/Variance reduction & Mutual Information against your prospective target.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Select Target Column</label>
                <select
                  value={targetCol}
                  onChange={(e) => setTargetCol(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  <option value="">-- Choose Target --</option>
                  {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <button
                onClick={handleComputeImportance}
                disabled={importanceLoading || !targetCol}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
              >
                {importanceLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Calculate Importance Scores</span>
              </button>
            </div>

            {importanceResults.length > 0 && (
              <div className="mt-6 space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Ranked Features:</div>
                {importanceResults.slice(0, 7).map((item, idx) => (
                  <div key={item.feature} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{idx + 1}. {item.feature}</span>
                      <span className="text-slate-500">{item.random_forest_importance}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(item.random_forest_importance * 100 * 2, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
