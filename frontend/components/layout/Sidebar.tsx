'use client';

import React from 'react';
import { useAppStore, WorkspaceTab } from '@/stores/useAppStore';
import { 
  LayoutDashboard, 
  UploadCloud, 
  ShieldCheck, 
  Sparkles, 
  BarChart3, 
  Layers, 
  SlidersHorizontal, 
  Filter, 
  AlertTriangle, 
  BrainCircuit, 
  Trophy, 
  PlaySquare, 
  Binary, 
  FileText, 
  History,
  Download
} from 'lucide-react';
import { api } from '@/lib/api';

interface NavItem {
  id: WorkspaceTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export default function Sidebar() {
  const { activeTab, setActiveTab, currentDataset, trainingResult } = useAppStore();

  const groups: NavGroup[] = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'ingestion', label: '1. Ingestion', icon: UploadCloud },
        { id: 'inspection', label: '2. Inspection & Quality', icon: ShieldCheck },
        { id: 'cleaning', label: '3. Data Cleaning', icon: Sparkles },
        { id: 'eda', label: '4. Dynamic EDA', icon: BarChart3 },
      ]
    },
    {
      title: 'FEATURE STUDIO',
      items: [
        { id: 'feature_extraction', label: '5. Feature Extraction', icon: Layers },
        { id: 'feature_engineering', label: '6. Feature Engineering', icon: SlidersHorizontal },
        { id: 'feature_selection', label: '7. Feature Selection', icon: Filter },
        { id: 'leakage_check', label: '8. Leakage Scanner', icon: AlertTriangle },
      ]
    },
    {
      title: 'MACHINE LEARNING',
      items: [
        { id: 'automl', label: '9. AutoML Studio', icon: BrainCircuit, badge: 'Auto' },
        { id: 'evaluation', label: '10. Benchmark & Eval', icon: Trophy, badge: trainingResult ? 'Winner' : undefined },
        { id: 'prediction', label: '11. Prediction Studio', icon: PlaySquare },
        { id: 'model_intelligence', label: '12. Model Intelligence', icon: Binary },
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'reports', label: '13. Reports & Exports', icon: FileText },
        { id: 'experiments', label: '14. Experiment History', icon: History },
      ]
    }
  ];

  return (
    <aside className="w-60 bg-[#111827] text-slate-300 p-3 flex flex-col justify-between shrink-0 h-[calc(100vh-3.5rem)] border-r border-[#1E293B] select-none overflow-y-auto">
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="px-2.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1">
              {group.title}
            </div>
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                // Support both 'automl' and 'training' active tab state
                const isActive = activeTab === item.id || (item.id === 'automl' && activeTab === 'training');

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#3157A4] text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-[#1E293B]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#1E293B] text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Active Dataset Footer Card */}
      <div className="pt-3 border-t border-[#1E293B]">
        <div className="p-2.5 rounded-xl bg-[#172235] border border-[#2B3A50] text-xs">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase mb-1">
            <span>Active Dataset</span>
            {currentDataset && (
              <span className="text-[#7899D4]">v{currentDataset.version}</span>
            )}
          </div>
          {currentDataset ? (
            <div>
              <div className="font-semibold text-white truncate text-xs">{currentDataset.name}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                <span>{currentDataset.row_count.toLocaleString()} rows</span>
                <span>{currentDataset.column_count} cols</span>
              </div>
              <a
                href={api.getDatasetDownloadUrl(currentDataset.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 w-full py-1 rounded-md bg-[#1E293B] hover:bg-[#2B3A50] text-[#7899D4] font-medium text-[11px] flex items-center justify-center space-x-1 transition-colors"
                title="Download active dataset"
              >
                <Download className="w-3 h-3" />
                <span>Export Dataset</span>
              </a>
            </div>
          ) : (
            <div className="text-slate-500 italic text-[11px]">No dataset loaded</div>
          )}
        </div>
      </div>
    </aside>
  );
}
