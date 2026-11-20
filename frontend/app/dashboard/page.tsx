'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import OverviewTab from '@/components/workspace/OverviewTab';
import IngestionTab from '@/components/workspace/IngestionTab';
import InspectionTab from '@/components/workspace/InspectionTab';
import CleaningTab from '@/components/workspace/CleaningTab';
import EDATab from '@/components/workspace/EDATab';
import FeatureExtractionTab from '@/components/workspace/FeatureExtractionTab';
import FeatureEngineeringTab from '@/components/workspace/FeatureEngineeringTab';
import FeatureSelectionTab from '@/components/workspace/FeatureSelectionTab';
import LeakageCheckTab from '@/components/workspace/LeakageCheckTab';
import AutoMLTab from '@/components/workspace/AutoMLTab';
import EvaluationTab from '@/components/workspace/EvaluationTab';
import PredictionTab from '@/components/workspace/PredictionTab';
import ModelIntelligenceTab from '@/components/workspace/ModelIntelligenceTab';
import ReportsTab from '@/components/workspace/ReportsTab';
import ExperimentsTab from '@/components/workspace/ExperimentsTab';

export default function DashboardPage() {
  const { activeTab, currentDataset, setCurrentDataset, setDatasets, setCurrentProfile } = useAppStore();

  useEffect(() => {
    // Initial fetch of datasets
    api.getDatasets().then(list => {
      const safeList = Array.isArray(list) ? list : (list?.results || []);
      setDatasets(safeList);
      if (safeList.length > 0 && !currentDataset) {
        setCurrentDataset(safeList[0]);
        api.getDatasetProfile(safeList[0].id).then(prof => {
          setCurrentProfile(prof);
        }).catch(err => console.error(err));
      }
    }).catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0D1320] text-[#172033] dark:text-[#F1F5F9] flex flex-col font-sans transition-colors">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-5 sm:p-7">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'ingestion' && <IngestionTab />}
          {activeTab === 'inspection' && <InspectionTab />}
          {activeTab === 'cleaning' && <CleaningTab />}
          {activeTab === 'eda' && <EDATab />}
          {activeTab === 'feature_extraction' && <FeatureExtractionTab />}
          {activeTab === 'feature_engineering' && <FeatureEngineeringTab />}
          {activeTab === 'feature_selection' && <FeatureSelectionTab />}
          {activeTab === 'leakage_check' && <LeakageCheckTab />}
          {(activeTab === 'automl' || activeTab === 'training') && <AutoMLTab />}
          {activeTab === 'evaluation' && <EvaluationTab />}
          {activeTab === 'prediction' && <PredictionTab />}
          {activeTab === 'model_intelligence' && <ModelIntelligenceTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'experiments' && <ExperimentsTab />}
        </main>
      </div>
    </div>
  );
}
