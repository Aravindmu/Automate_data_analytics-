'use client';

import React from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { 
  Database, 
  ShieldCheck, 
  Trophy, 
  Sparkles, 
  BrainCircuit, 
  ArrowRight, 
  Play, 
  FileSpreadsheet,
  Layers,
  Filter,
  AlertTriangle,
  Binary,
  BarChart3
} from 'lucide-react';

export default function OverviewTab() {
  const { currentDataset, currentProject, datasets, trainingResult, setActiveTab, setCurrentDataset, setCurrentProfile } = useAppStore();

  const handleQuickLoad = async (type: 'housing' | 'churn') => {
    try {
      let ds;
      if (type === 'housing') {
        ds = await api.loadCaliforniaHousing();
      } else {
        ds = await api.loadCustomerChurn();
      }
      setCurrentDataset(ds);
      const prof = await api.getDatasetProfile(ds.id);
      setCurrentProfile(prof);
      setActiveTab('inspection');
    } catch (err: any) {
      alert(`Failed to load benchmark dataset: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome Card - Linear / Stripe Style */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-[#3157A4]/10 text-[#3157A4] dark:text-[#7899D4] text-[11px] font-semibold mb-2">
            <Sparkles className="w-3 h-3 text-[#3157A4]" />
            <span>Automated Data Science & ML Platform</span>
          </div>
          <h1 className="text-xl font-bold text-[#172033] dark:text-white tracking-tight">
            Scientific Workspace Overview
          </h1>
          <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-1 max-w-2xl leading-relaxed">
            Ingest, profile, clean, extract and engineer features. Benchmark predictive models with zero data leakage, and inspect explainability with SHAP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => handleQuickLoad('housing')}
            className="px-3 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] hover:bg-[#F5F7FA] dark:hover:bg-[#1D2B40] text-xs font-medium text-[#172033] dark:text-white transition-colors flex items-center space-x-1.5"
            title="Load California Housing regression dataset"
          >
            <Play className="w-3 h-3 text-[#16865D]" />
            <span>Load Housing (Regression)</span>
          </button>
          <button
            onClick={() => handleQuickLoad('churn')}
            className="px-3 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] hover:bg-[#F5F7FA] dark:hover:bg-[#1D2B40] text-xs font-medium text-[#172033] dark:text-white transition-colors flex items-center space-x-1.5"
            title="Load Bank Customer Churn classification dataset"
          >
            <Play className="w-3 h-3 text-[#D99A32]" />
            <span>Load Churn (Classification)</span>
          </button>
          <button
            onClick={() => setActiveTab('ingestion')}
            className="px-3 py-1.5 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white text-xs font-medium shadow-xs transition-colors flex items-center space-x-1"
          >
            <span>Ingest Data</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Dataset */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs">
          <div className="flex items-center justify-between text-[#667085] dark:text-[#A0AEC0] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Dataset</span>
            <Database className="w-4 h-4 text-[#3157A4]" />
          </div>
          <div className="text-lg font-bold text-[#172033] dark:text-white truncate">
            {currentDataset?.name || 'No Dataset'}
          </div>
          <div className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1 tabular-nums">
            {currentDataset ? `${currentDataset.row_count.toLocaleString()} rows • ${currentDataset.column_count} cols` : 'Ingest dataset to start'}
          </div>
        </div>

        {/* Quality Score */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs">
          <div className="flex items-center justify-between text-[#667085] dark:text-[#A0AEC0] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Quality Score</span>
            <ShieldCheck className="w-4 h-4 text-[#16865D]" />
          </div>
          <div className="text-lg font-bold text-[#172033] dark:text-white tabular-nums">
            {currentDataset?.metadata?.quality_score ? `${currentDataset.metadata.quality_score}/100` : 'Not Profiled'}
          </div>
          <div className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1">
            {currentDataset?.metadata?.quality_grade ? `Deterministic Grade ${currentDataset.metadata.quality_grade}` : 'Run Step 2 Quality Inspection'}
          </div>
        </div>

        {/* Best Model Winner */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs">
          <div className="flex items-center justify-between text-[#667085] dark:text-[#A0AEC0] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Benchmark Winner</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-[#172033] dark:text-white truncate">
            {trainingResult?.best_model?.model_name || 'No Models Trained'}
          </div>
          <div className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1 tabular-nums">
            {trainingResult ? `${trainingResult.primary_metric.toUpperCase()}: ${trainingResult.best_model?.metrics[trainingResult.primary_metric] || trainingResult.best_model?.cv_score_mean}` : 'Train in Step 9 AutoML'}
          </div>
        </div>

        {/* Total Dataset Versions */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs">
          <div className="flex items-center justify-between text-[#667085] dark:text-[#A0AEC0] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dataset Versions</span>
            <FileSpreadsheet className="w-4 h-4 text-[#5278B8]" />
          </div>
          <div className="text-lg font-bold text-[#172033] dark:text-white tabular-nums">
            {datasets.length} Versions
          </div>
          <div className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1">
            Preserving lineage history
          </div>
        </div>
      </div>

      {/* Structured Pipeline Workflow Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A0AEC0]">
          End-to-End Pipeline Navigation
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Inspection & Quality */}
          <div 
            onClick={() => setActiveTab('inspection')}
            className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs hover:border-[#3157A4] transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#3157A4]/10 text-[#3157A4] flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white group-hover:text-[#3157A4] transition-colors">
              2. Inspection & Quality
            </h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1 leading-relaxed">
              5-factor deterministic score (0-100), missing heatmap, and IQR/skewness statistics.
            </p>
          </div>

          {/* Card 2: Feature Extraction */}
          <div 
            onClick={() => setActiveTab('feature_extraction')}
            className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs hover:border-[#3157A4] transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#5278B8]/10 text-[#5278B8] flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white group-hover:text-[#3157A4] transition-colors">
              5. Feature Extraction
            </h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1 leading-relaxed">
              Text TF-IDF & lengths, datetime cyclical decomposition, and polynomial cross-products.
            </p>
          </div>

          {/* Card 3: Feature Selection */}
          <div 
            onClick={() => setActiveTab('feature_selection')}
            className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs hover:border-[#3157A4] transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
              <Filter className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white group-hover:text-[#3157A4] transition-colors">
              7. Feature Selection
            </h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1 leading-relaxed">
              Variance thresholding, collinearity pruning, and SelectKBest mutual information.
            </p>
          </div>

          {/* Card 4: Leakage Scanner */}
          <div 
            onClick={() => setActiveTab('leakage_check')}
            className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs hover:border-[#3157A4] transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#D94F54]/10 text-[#D94F54] flex items-center justify-center mb-3">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white group-hover:text-[#3157A4] transition-colors">
              8. Leakage Scanner
            </h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1 leading-relaxed">
              Detects proxy features, entity identifiers, and target contamination prior to training.
            </p>
          </div>

          {/* Card 5: AutoML Studio */}
          <div 
            onClick={() => setActiveTab('automl')}
            className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs hover:border-[#3157A4] transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#3157A4]/10 text-[#3157A4] flex items-center justify-center mb-3">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white group-hover:text-[#3157A4] transition-colors">
              9. AutoML Studio
            </h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1 leading-relaxed">
              Automatic problem detection, multi-model leaderboard, SMOTE imbalance, and Optuna.
            </p>
          </div>

          {/* Card 6: Evaluation & Benchmark */}
          <div 
            onClick={() => setActiveTab('evaluation')}
            className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs hover:border-[#3157A4] transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#16865D]/10 text-[#16865D] flex items-center justify-center mb-3">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white group-hover:text-[#3157A4] transition-colors">
              10. Benchmark & Eval
            </h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1 leading-relaxed">
              Ranked comparison, confusion matrix heatmap, residual plots, and winner export.
            </p>
          </div>

          {/* Card 7: Model Intelligence */}
          <div 
            onClick={() => setActiveTab('model_intelligence')}
            className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs hover:border-[#3157A4] transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#5278B8]/10 text-[#5278B8] flex items-center justify-center mb-3">
              <Binary className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white group-hover:text-[#3157A4] transition-colors">
              12. Model Intelligence
            </h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1 leading-relaxed">
              SHAP feature attribution, overfitting diagnostics, what-if simulator, and error analysis.
            </p>
          </div>

          {/* Card 8: Dynamic EDA Studio */}
          <div 
            onClick={() => setActiveTab('eda')}
            className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs hover:border-[#3157A4] transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#3157A4]/10 text-[#3157A4] flex items-center justify-center mb-3">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white group-hover:text-[#3157A4] transition-colors">
              4. Dynamic EDA
            </h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1 leading-relaxed">
              Histograms, violins, 2D/3D scatters, PCA projections, and automated chart recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
