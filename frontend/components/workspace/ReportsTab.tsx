'use client';

import React from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { FileText, FileSpreadsheet, Download, Code, Cpu, CheckCircle } from 'lucide-react';

export default function ReportsTab() {
  const { currentDataset, trainingResult, setActiveTab } = useAppStore();

  if (!currentDataset) {
    return (
      <div className="p-8 text-center rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50]">
        <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-[#172033] dark:text-white">No dataset selected</h3>
        <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-1 mb-4">Please select a dataset to export reports.</p>
        <button onClick={() => setActiveTab('ingestion')} className="px-4 py-2 rounded-lg bg-[#3157A4] text-white text-xs font-medium">
          Go to Ingestion
        </button>
      </div>
    );
  }

  const pdfUrl = api.getPDFReportUrl(currentDataset.id);
  const excelUrl = api.getExcelReportUrl(currentDataset.id);
  const downloadDatasetUrl = api.getDatasetDownloadUrl(currentDataset.id);
  const modelArtifactUrl = trainingResult?.best_model?.experiment_id 
    ? api.getModelArtifactUrl(trainingResult.best_model.experiment_id) 
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-[#E5E9F0] dark:border-[#2B3A50]">
        <h2 className="text-lg font-semibold text-[#172033] dark:text-white">Analytical Reports & Production Exports</h2>
        <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-0.5">
          Export publication-grade executive PDF summaries, multi-sheet Excel workbooks, cleaned datasets, and serialized machine learning pipelines
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PDF Executive Report */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white">Executive PDF Audit Report</h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] leading-relaxed">
              ReportLab generated summary containing 5-factor quality dimensions, missing values breakdown, and ML benchmark tables.
            </p>
          </div>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF Report</span>
          </a>
        </div>

        {/* Excel Multi-Sheet Workbook */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-[#16865D]/10 text-[#16865D] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white">Excel Analytical Workbook</h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] leading-relaxed">
              Multi-tab spreadsheet with dataset overview, descriptive statistics (Mean, IQR, Skewness), and benchmark comparisons.
            </p>
          </div>

          <a
            href={excelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 rounded-lg bg-[#16865D] hover:bg-[#13714e] text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel (.xlsx)</span>
          </a>
        </div>

        {/* Cleaned Dataset File */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-[#3157A4]/10 text-[#3157A4] flex items-center justify-center">
              <Code className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white">Cleaned Dataset Export</h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] leading-relaxed">
              Direct download of the active dataset version ({currentDataset.name} v{currentDataset.version}) with imputed nulls and handled outliers.
            </p>
          </div>

          <a
            href={downloadDatasetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Cleaned Dataset</span>
          </a>
        </div>

        {/* Trained Pipeline Artifact */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-[#5278B8]/10 text-[#5278B8] flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white">Trained Model Artifact</h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] leading-relaxed">
              Serialized Scikit-learn Pipeline artifact (.joblib) containing fitted ColumnTransformers, scalers, encoders, and the winner estimator.
            </p>
          </div>

          {modelArtifactUrl ? (
            <a
              href={modelArtifactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 rounded-lg bg-[#5278B8] hover:bg-[#43649e] text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Model (.joblib)</span>
            </a>
          ) : (
            <button
              disabled
              className="w-full py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium text-xs cursor-not-allowed"
            >
              Train Model to Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
