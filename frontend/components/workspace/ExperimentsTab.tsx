'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { History, Download, RefreshCw, Cpu, Layers } from 'lucide-react';
import { ExperimentItem } from '@/types';

export default function ExperimentsTab() {
  const [experiments, setExperiments] = useState<ExperimentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExperiments = async () => {
    setLoading(true);
    try {
      const data = await api.getExperiments();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setExperiments(list);
    } catch (err: any) {
      console.error(err);
      setExperiments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E9F0] dark:border-[#2B3A50]">
        <div>
          <h2 className="text-lg font-semibold text-[#172033] dark:text-white">Experiment Tracking & Model Registry</h2>
          <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-0.5">
            Persistent model evaluation lineage, cross-validation scores, and serialized .joblib pipelines
          </p>
        </div>

        <button
          onClick={fetchExperiments}
          className="p-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] hover:bg-[#F5F7FA] dark:hover:bg-[#172235] text-[#667085] dark:text-[#A0AEC0] transition-colors"
          title="Refresh experiments"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="rounded-xl border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F5F7FA] dark:bg-[#1D2B40] border-b border-[#E5E9F0] dark:border-[#2B3A50] text-[#667085] dark:text-[#A0AEC0]">
              <tr>
                <th className="p-3 font-semibold">Logged Date</th>
                <th className="p-3 font-semibold">Algorithm</th>
                <th className="p-3 font-semibold">Dataset</th>
                <th className="p-3 font-semibold">Problem Type</th>
                <th className="p-3 font-semibold">Target (Y)</th>
                <th className="p-3 font-semibold">Primary Score</th>
                <th className="p-3 font-semibold">CV Mean &plusmn; Std</th>
                <th className="p-3 font-semibold">Duration</th>
                <th className="p-3 font-semibold">Model Artifact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9F0] dark:divide-[#2B3A50] text-[11px]">
              {(!Array.isArray(experiments) || experiments.length === 0) ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-sans">
                    No experiments logged yet. Train a model in AutoML Studio to see tracked experiments.
                  </td>
                </tr>
              ) : (
                experiments.map((exp) => {
                  const m = exp.metrics || {};
                  const primaryVal = m.r2 !== undefined ? `R² ${m.r2}` : (m.f1 !== undefined ? `F1 ${m.f1}` : (m.accuracy !== undefined ? `Acc ${m.accuracy}` : '-'));
                  return (
                    <tr key={exp.id} className="hover:bg-[#F5F7FA] dark:hover:bg-[#1D2B40] transition-colors">
                      <td className="p-3 text-[#667085] dark:text-[#A0AEC0]">{new Date(exp.created_at).toLocaleDateString()}</td>
                      <td className="p-3 font-semibold text-[#172033] dark:text-white flex items-center space-x-1.5">
                        <Cpu className="w-3.5 h-3.5 text-[#3157A4]" />
                        <span>{exp.model_name}</span>
                      </td>
                      <td className="p-3 text-[#667085] dark:text-[#A0AEC0]">{exp.dataset_name}</td>
                      <td className="p-3 capitalize text-[#667085] dark:text-[#A0AEC0]">{exp.problem_type.replace('_', ' ')}</td>
                      <td className="p-3 font-semibold text-[#3157A4] dark:text-[#7899D4]">{exp.target_column}</td>
                      <td className="p-3 font-bold font-mono text-[#16865D]">{primaryVal}</td>
                      <td className="p-3 font-mono text-[#667085] dark:text-[#A0AEC0]">{exp.cv_scores?.mean !== undefined ? `${exp.cv_scores.mean} ± ${exp.cv_scores.std || 0}` : '-'}</td>
                      <td className="p-3 text-[#667085] dark:text-[#A0AEC0]">{exp.training_time_seconds ? exp.training_time_seconds.toFixed(2) : '0'}s</td>
                      <td className="p-3">
                        <a
                          href={api.getModelArtifactUrl(exp.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#3157A4] dark:text-[#7899D4] font-semibold hover:underline flex items-center space-x-1"
                        >
                          <Download className="w-3.5 h-3.5 text-[#16865D]" />
                          <span>.joblib</span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
