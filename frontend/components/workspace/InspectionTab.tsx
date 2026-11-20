'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { ShieldCheck, AlertTriangle, Info, CheckCircle2, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { ColumnStat } from '@/types';

export default function InspectionTab() {
  const { currentDataset, currentProfile, setCurrentProfile, setActiveTab } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedColumn, setSelectedColumn] = useState<ColumnStat | null>(null);

  const fetchProfile = async () => {
    if (!currentDataset) return;
    setLoading(true);
    try {
      const res = await api.getDatasetProfile(currentDataset.id);
      setCurrentProfile(res);
      if (res.profiling.columns.length > 0) {
        setSelectedColumn(res.profiling.columns[0]);
      }
    } catch (err: any) {
      alert(`Profiling failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentDataset && (!currentProfile || currentProfile.dataset_id !== currentDataset.id)) {
      fetchProfile();
    } else if (currentProfile && currentProfile.profiling.columns.length > 0 && !selectedColumn) {
      setSelectedColumn(currentProfile.profiling.columns[0]);
    }
  }, [currentDataset]);

  if (!currentDataset) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">No active dataset</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">Please ingest or load a dataset first.</p>
        <button
          onClick={() => setActiveTab('ingestion')}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md"
        >
          Go to Ingestion
        </button>
      </div>
    );
  }

  if (loading || !currentProfile) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Computing dataset statistics, correlations & data quality score...</span>
      </div>
    );
  }

  const { overview, columns, missing_matrix } = currentProfile.profiling;
  const { overall_score, grade, status_text, components, recommendations } = currentProfile.quality_score;

  const filteredColumns = columns.filter(c => filterType === 'all' || c.dtype_group === filterType);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Dataset Inspection & Quality Assessment</h2>
          <p className="text-sm text-slate-500">{currentDataset.name} (Version {currentDataset.version}) • {overview.total_rows.toLocaleString()} rows • {overview.total_columns} columns</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchProfile}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Re-run inspection"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setActiveTab('cleaning')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md hover:bg-blue-700 transition-all flex items-center space-x-2"
          >
            <span>Proceed to Cleaning Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quality Score Hero Card */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        {/* Left: Big Score & Grade */}
        <div className="flex items-center space-x-6 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 pb-6 lg:pb-0 lg:pr-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{overall_score}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">/ 100</span>
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Health Grade</span>
              <span className={`px-2 py-0.5 rounded text-xs font-black ${
                grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                grade === 'B' ? 'bg-blue-100 text-blue-800' :
                grade === 'C' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }`}>
                GRADE {grade}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{status_text} Quality</h3>
            <p className="text-xs text-slate-500 mt-1">Deterministic weighted scoring evaluating 5 quality dimensions.</p>
          </div>
        </div>

        {/* Middle: 5 Weighted Components */}
        <div className="lg:col-span-2 space-y-2.5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quality Score Calculation Breakdown</div>
          {Object.entries(components).map(([key, comp]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{key.replace('_', ' ').toUpperCase()} ({comp.weight_pct}% weight)</span>
                <span className="text-slate-900 dark:text-white font-bold">{comp.score}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    comp.score >= 90 ? 'bg-emerald-500' :
                    comp.score >= 75 ? 'bg-blue-500' :
                    comp.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${comp.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Recommendations */}
      {recommendations.length > 0 && (
        <div className="p-6 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-3">
          <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Automated Data Quality Recommendations ({recommendations.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-800/40 text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                  rec.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {rec.severity}
                </span>
                <span>{rec.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Value Heatmap preview */}
      {missing_matrix && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Missing Values Distribution Heatmap</h3>
              <p className="text-xs text-slate-500">Sample of top {missing_matrix.sample_rows} rows across all {missing_matrix.columns.length} columns (Red = Missing, Blue = Present)</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-blue-500" />
                <span>Present</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-red-400" />
                <span>Missing</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="grid gap-0.5 min-w-[600px]" style={{ gridTemplateColumns: `repeat(${missing_matrix.columns.length}, minmax(0, 1fr))` }}>
              {missing_matrix.columns.map((c) => (
                <div key={c} className="text-[10px] font-semibold text-slate-400 truncate text-center mb-1" title={c}>
                  {c}
                </div>
              ))}
              {missing_matrix.matrix.map((row, rIdx) => (
                <React.Fragment key={rIdx}>
                  {row.map((val, cIdx) => (
                    <div
                      key={cIdx}
                      className={`h-2.5 rounded-xs transition-opacity hover:opacity-100 ${
                        val === 1 ? 'bg-red-400' : 'bg-blue-500/80'
                      }`}
                      title={`Row ${rIdx + 1}, ${missing_matrix.columns[cIdx]}: ${val === 1 ? 'Missing' : 'Present'}`}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Columns Statistical Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Column-Level Statistical Analysis</h3>
          <div className="flex space-x-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            {['all', 'numeric', 'categorical', 'datetime'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  filterType === type
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Column Name</th>
                  <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Type</th>
                  <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Missing</th>
                  <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Unique</th>
                  <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Mean / Top Value</th>
                  <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Median</th>
                  <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Std Dev</th>
                  <th className="p-3 font-bold text-slate-700 dark:text-slate-200">IQR</th>
                  <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Outliers</th>
                  <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Skewness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                {filteredColumns.map((col) => {
                  const st = col.stats;
                  return (
                    <tr 
                      key={col.name} 
                      onClick={() => setSelectedColumn(col)}
                      className={`cursor-pointer transition-colors ${
                        selectedColumn?.name === col.name ? 'bg-blue-50/60 dark:bg-blue-950/30' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-3 font-bold text-slate-900 dark:text-white font-sans">{col.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          col.dtype_group === 'numeric' ? 'bg-blue-100 text-blue-800' :
                          col.dtype_group === 'categorical' ? 'bg-purple-100 text-purple-800' :
                          col.dtype_group === 'datetime' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {col.dtype_group}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {col.missing_count} ({col.missing_pct}%)
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {col.unique_count}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 font-sans">
                        {st?.mean !== undefined ? st.mean : (st?.top_value || '-')}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {st?.median !== undefined ? st.median : '-'}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {st?.std !== undefined ? st.std : '-'}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {st?.iqr !== undefined ? st.iqr : '-'}
                      </td>
                      <td className="p-3">
                        {st?.outliers_count ? (
                          <span className="text-red-600 font-bold">{st.outliers_count} ({st.outliers_pct}%)</span>
                        ) : '-'}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {st?.skewness !== undefined ? st.skewness : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
