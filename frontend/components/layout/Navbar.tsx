'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '@/stores/useAppStore';
import { Database, FolderGit2, Cpu, ChevronRight, Sun, Moon, Sparkles, ExternalLink } from 'lucide-react';

export default function Navbar() {
  const { currentDataset, currentProject, activeTab, theme, toggleTheme } = useAppStore();

  const tabNames: Record<string, string> = {
    overview: 'Workspace Overview',
    ingestion: 'Data Ingestion',
    inspection: 'Data Quality & Profiling',
    cleaning: 'Data Cleaning Studio',
    eda: 'Dynamic EDA Studio',
    feature_extraction: 'Feature Extraction',
    feature_engineering: 'Feature Engineering',
    feature_selection: 'Feature Selection',
    leakage_check: 'Data Leakage Scanner',
    automl: 'Automated ML (AutoML)',
    training: 'Automated ML (AutoML)',
    evaluation: 'Benchmark & Evaluation',
    prediction: 'Prediction Studio',
    model_intelligence: 'Model Intelligence & SHAP',
    reports: 'Analytical Reports & Export',
    experiments: 'Experiment History',
  };

  return (
    <header className="h-14 border-b border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#111A2B] sticky top-0 z-30 flex items-center justify-between px-6 transition-colors">
      {/* Left side: Brand & Breadcrumbs */}
      <div className="flex items-center space-x-3 text-xs text-[#667085] dark:text-[#A0AEC0]">
        <Link href="/" className="flex items-center space-x-2 font-bold text-[#172033] dark:text-[#F1F5F9] hover:text-[#3157A4] transition-colors">

          <span className="font-semibold text-sm tracking-tight text-[#172033] dark:text-white">AutoDataScience</span>
        </Link>

        <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3] dark:text-[#64748B]" />

        <div className="hidden sm:flex items-center space-x-1.5 font-medium text-[#172033] dark:text-[#F1F5F9]">
          <FolderGit2 className="w-3.5 h-3.5 text-[#667085] dark:text-[#A0AEC0]" />
          <span>{currentProject?.name || 'Default Workspace'}</span>
        </div>

        {currentDataset && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3] dark:text-[#64748B]" />
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-[#F5F7FA] dark:bg-[#172235] text-[#3157A4] dark:text-[#7899D4] font-medium border border-[#E5E9F0] dark:border-[#2B3A50]">
              <Database className="w-3 h-3 text-[#3157A4] dark:text-[#7899D4]" />
              <span className="truncate max-w-[150px]">{currentDataset.name} (v{currentDataset.version})</span>
            </div>
          </>
        )}

        <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3] dark:text-[#64748B]" />
        <span className="font-semibold text-[#172033] dark:text-white">{tabNames[activeTab] || 'Workspace'}</span>
      </div>

      {/* Right side: Controls & Theme Toggle */}
      <div className="flex items-center space-x-3">
        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] hover:bg-[#F5F7FA] dark:hover:bg-[#172235] text-[#667085] dark:text-[#A0AEC0] transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#3157A4]" />
          )}
        </button>

        <Link
          href="/"
          className="text-xs font-medium text-[#667085] dark:text-[#A0AEC0] hover:text-[#172033] dark:hover:text-white px-3 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] hover:bg-[#F5F7FA] dark:hover:bg-[#172235] transition-all flex items-center space-x-1"
        >
          <span>Home</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </header>
  );
}
