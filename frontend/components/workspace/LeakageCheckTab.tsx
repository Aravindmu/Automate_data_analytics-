'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { AlertTriangle, ShieldCheck, ShieldAlert, AlertCircle, Play, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { LeakageReport } from '@/types';

export default function LeakageCheckTab() {
  const { currentDataset, currentProfile, setActiveTab } = useAppStore();

  const [targetColumn, setTargetColumn] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<LeakageReport | null>(null);

  const columns = currentProfile?.profiling?.columns || [];

  useEffect(() => {
    if (columns.length > 0 && !targetColumn) {
      setTargetColumn(columns[columns.length - 1].name);
    }
  }, [columns]);

  const handleRunScan = async () => {
    if (!currentDataset || !targetColumn) return;
    setLoading(true);
    try {
      const res: LeakageReport = await api.checkLeakage(currentDataset.id, targetColumn);
      setReport(res);
    } catch (err: any) {
      alert(`Leakage scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!currentDataset) {
    return (
      <div className="p-8 text-center rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50]">
        <AlertTriangle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-[#172033] dark:text-white">No dataset selected</h3>
        <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-1 mb-4">Please select a dataset to inspect for data leakage.</p>
        <button onClick={() => setActiveTab('ingestion')} className="px-4 py-2 rounded-lg bg-[#3157A4] text-white text-xs font-medium">
          Go to Ingestion
        </button>
      </div>
    );
  }

  const criticalCount = report?.warnings.filter(w => w.severity === 'CRITICAL').length || 0;
  const highCount = report?.warnings.filter(w => w.severity === 'HIGH').length || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E9F0] dark:border-[#2B3A50]">
        <div>
          <h2 className="text-lg font-semibold text-[#172033] dark:text-white">Data Leakage Prevention Scanner</h2>
          <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-0.5">
            Identify target proxy features, identity column memorization, and temporal contamination before training
          </p>
        </div>

        <button
          onClick={() => setActiveTab('automl')}
          className="px-3.5 py-1.5 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white text-xs font-medium shadow-xs transition-colors flex items-center space-x-1.5"
        >
          <span>Proceed to AutoML Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Target Selection & Scan Bar */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label className="text-xs font-medium text-[#667085] dark:text-[#A0AEC0] shrink-0">Target Outcome Variable:</label>
          <select
            value={targetColumn}
            onChange={(e) => setTargetColumn(e.target.value)}
            className="w-full md:w-64 px-3 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
          >
            {columns.map(c => <option key={c.name} value={c.name} className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">{c.name}</option>)}
          </select>
        </div>

        <button
          onClick={handleRunScan}
          disabled={loading || !targetColumn}
          className="w-full md:w-auto px-5 py-2 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white text-xs font-medium shadow-xs transition-colors flex items-center justify-center space-x-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>Run Comprehensive Leakage Scan</span>
        </button>
      </div>

      {/* Results View */}
      {report && (
        <div className="space-y-4">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            report.is_safe 
              ? 'bg-[#16865D]/10 border-[#16865D]/30 text-[#16865D]' 
              : 'bg-[#D94F54]/10 border-[#D94F54]/30 text-[#D94F54]'
          }`}>
            <div className="flex items-center space-x-3">
              {report.is_safe ? (
                <ShieldCheck className="w-6 h-6 text-[#16865D]" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-[#D94F54]" />
              )}
              <div>
                <h4 className="font-semibold text-xs text-[#172033] dark:text-white">
                  {report.is_safe ? 'Safe from Critical Leakage' : 'Critical Data Leakage Risks Detected'}
                </h4>
                <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-0.5">
                  {report.is_safe 
                    ? 'No direct mathematical duplicates or target proxy features detected in active schema.'
                    : `Identified ${criticalCount} critical and ${highCount} high-severity contamination vectors.`}
                </p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
              report.is_safe ? 'bg-[#16865D] text-white' : 'bg-[#D94F54] text-white'
            }`}>
              {report.is_safe ? 'PASSED' : 'ACTION REQUIRED'}
            </span>
          </div>

          {/* Warnings List */}
          {report.warnings.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50]">
              <CheckCircle2 className="w-10 h-10 text-[#16865D] mx-auto mb-2" />
              <h4 className="text-xs font-semibold text-[#172033] dark:text-white">All Automated Leakage Checks Clean</h4>
              <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1">
                Zero proxy columns, near-perfect correlations, or primary key memorization found.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A0AEC0] block">
                Detected Leakage Vectors ({report.warnings.length}):
              </span>

              {report.warnings.map((w, idx) => {
                const isCritical = w.severity === 'CRITICAL';
                const isHigh = w.severity === 'HIGH';
                const badgeColor = isCritical 
                  ? 'bg-[#D94F54]/10 text-[#D94F54] border-[#D94F54]/30' 
                  : (isHigh ? 'bg-[#D99A32]/10 text-[#D99A32] border-[#D99A32]/30' : 'bg-slate-100 text-slate-600 border-slate-200');

                return (
                  <div key={idx} className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className={`w-4 h-4 ${isCritical ? 'text-[#D94F54]' : (isHigh ? 'text-[#D99A32]' : 'text-slate-400')}`} />
                        <h4 className="font-semibold text-xs text-[#172033] dark:text-white">{w.title}</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badgeColor}`}>
                        {w.severity}
                      </span>
                    </div>

                    <p className="text-xs text-[#667085] dark:text-[#A0AEC0]">{w.description}</p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                      <span className="text-[#667085] font-medium">Affected:</span>
                      {w.columns.map(c => (
                        <span key={c} className="px-1.5 py-0.5 rounded bg-[#F5F7FA] dark:bg-[#1D2B40] border border-[#E5E9F0] dark:border-[#2B3A50] text-[#172033] dark:text-white font-mono text-[10px]">
                          {c}
                        </span>
                      ))}
                    </div>

                    <div className="p-2 rounded-lg bg-[#F5F7FA] dark:bg-[#1D2B40] text-[11px] text-[#172033] dark:text-[#F1F5F9]">
                      <span className="font-semibold text-[#3157A4] dark:text-[#7899D4]">Action: </span>
                      <span>{w.recommendation}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
