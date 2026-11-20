'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import confetti from 'canvas-confetti';
import { 
  BrainCircuit, 
  Play, 
  CheckSquare, 
  Square, 
  Sliders, 
  Sparkles, 
  Loader2, 
  Trophy, 
  ArrowRight,
  Download,
  AlertTriangle,
  Scale,
  CheckCircle2
} from 'lucide-react';

export default function AutoMLTab() {
  const { currentDataset, currentProfile, setTrainingResult, setActiveTab, trainingResult } = useAppStore();

  const [targetColumn, setTargetColumn] = useState<string>('');
  const [problemType, setProblemType] = useState<string>('regression');
  const [availableModels, setAvailableModels] = useState<Array<{ key: string; name: string }>>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [excludedFeatures, setExcludedFeatures] = useState<string[]>([]);
  const [testSize, setTestSize] = useState<number>(0.2);
  const [cvFolds, setCvFolds] = useState<number>(3);
  const [primaryMetric, setPrimaryMetric] = useState<string>('r2');
  const [enableTuning, setEnableTuning] = useState<boolean>(false);
  const [tuningTrials, setTuningTrials] = useState<number>(5);
  const [enableImbalance, setEnableImbalance] = useState<boolean>(false);
  const [imbalanceStrategy, setImbalanceStrategy] = useState<string>('smote');

  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingStage, setTrainingStage] = useState<string>('');

  const columns = currentProfile?.profiling?.columns || [];

  // Auto-detect target column and problem type
  useEffect(() => {
    if (currentDataset && columns.length > 0) {
      const suggestedTarget = currentDataset.metadata?.suggested_target || columns[columns.length - 1].name;
      setTargetColumn(suggestedTarget);

      const targetColInfo = columns.find(c => c.name === suggestedTarget);
      if (targetColInfo) {
        if (targetColInfo.dtype_group === 'numeric' && targetColInfo.unique_count > 10) {
          setProblemType('regression');
          setPrimaryMetric('r2');
        } else {
          setProblemType(targetColInfo.unique_count <= 2 ? 'binary_classification' : 'multiclass_classification');
          setPrimaryMetric('f1');
        }
      }
    }
  }, [currentDataset, currentProfile]);

  // Load available models for selected problem type
  useEffect(() => {
    api.getAvailableModels(problemType).then(res => {
      setAvailableModels(res.models || []);
      const defaultPicks = res.models.slice(0, 4).map(m => m.key);
      setSelectedModels(defaultPicks);
    }).catch(err => console.error(err));
  }, [problemType]);

  const handleTargetChange = (val: string) => {
    setTargetColumn(val);
    const colInfo = columns.find(c => c.name === val);
    if (colInfo) {
      if (colInfo.dtype_group === 'numeric' && colInfo.unique_count > 10) {
        setProblemType('regression');
        setPrimaryMetric('r2');
      } else {
        setProblemType(colInfo.unique_count <= 2 ? 'binary_classification' : 'multiclass_classification');
        setPrimaryMetric('f1');
      }
    }
  };

  const toggleModelSelection = (key: string) => {
    if (selectedModels.includes(key)) {
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter(k => k !== key));
      }
    } else {
      setSelectedModels([...selectedModels, key]);
    }
  };

  const toggleFeatureExclusion = (col: string) => {
    if (excludedFeatures.includes(col)) {
      setExcludedFeatures(excludedFeatures.filter(c => c !== col));
    } else {
      setExcludedFeatures([...excludedFeatures, col]);
    }
  };

  const handleStartTraining = async () => {
    if (!currentDataset || !targetColumn) {
      alert('Please select a target column.');
      return;
    }
    if (selectedModels.length === 0) {
      alert('Please select at least one algorithm to benchmark.');
      return;
    }

    setIsTraining(true);
    setTrainingStage('Validating schema and partitioning train/test splits...');

    try {
      const config = {
        target_column: targetColumn,
        problem_type: problemType,
        algorithms: selectedModels,
        test_size: testSize,
        cv_folds: cvFolds,
        primary_metric: primaryMetric,
        enable_hyperparameter_tuning: enableTuning,
        tuning_trials: tuningTrials,
        enable_imbalance_handling: enableImbalance,
        imbalance_strategy: imbalanceStrategy,
        excluded_features: excludedFeatures,
        random_state: 42
      };

      setTrainingStage(`Training ${selectedModels.length} models with leakage-free cross-validation...`);
      const result = await api.trainModels(currentDataset.id, config);
      setTrainingResult(result);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      setActiveTab('evaluation');
    } catch (err: any) {
      alert(`AutoML training failed: ${err.message}`);
    } finally {
      setIsTraining(false);
      setTrainingStage('');
    }
  };

  if (!currentDataset) {
    return (
      <div className="p-8 text-center rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50]">
        <BrainCircuit className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-[#172033] dark:text-white">No dataset selected</h3>
        <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-1 mb-4">Please select a dataset to configure automated machine learning.</p>
        <button onClick={() => setActiveTab('ingestion')} className="px-4 py-2 rounded-lg bg-[#3157A4] text-white text-xs font-medium">
          Go to Ingestion
        </button>
      </div>
    );
  }

  const targetColInfo = columns.find(c => c.name === targetColumn);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Quick Downloads */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-[#E5E9F0] dark:border-[#2B3A50] gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#172033] dark:text-white">Automated Machine Learning (AutoML) Studio</h2>
          <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-0.5">
            Automatic problem classification, algorithm benchmarking, imbalance remediation, and Optuna Bayesian optimization
          </p>
        </div>

        {/* Direct Download Controls */}
        <div className="flex items-center space-x-2">
          <a
            href={api.getDatasetDownloadUrl(currentDataset.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] hover:bg-[#F5F7FA] dark:hover:bg-[#1D2B40] text-xs font-medium text-[#172033] dark:text-[#F1F5F9] transition-colors flex items-center space-x-1.5"
            title="Download Cleaned Dataset"
          >
            <Download className="w-3.5 h-3.5 text-[#16865D]" />
            <span>Download Cleaned Dataset</span>
          </a>

          {trainingResult?.best_model?.experiment_id && (
            <a
              href={api.getModelArtifactUrl(trainingResult.best_model.experiment_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#16865D] hover:bg-[#13714e] text-white text-xs font-medium shadow-xs transition-colors flex items-center space-x-1.5"
              title="Download Trained Model Artifact"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Model (.joblib)</span>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: AutoML Configuration */}
        <div className="lg:col-span-2 space-y-4">
          {/* 1. Target & Automatic Problem Detection */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3157A4] dark:text-[#7899D4]">
                1. Target Variable & Automatic Objective Detection
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#16865D]/10 text-[#16865D] font-semibold border border-[#16865D]/20">
                Auto-Detected: {problemType.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#667085] dark:text-[#A0AEC0] mb-1">Target Column (Y) *</label>
                <select
                  value={targetColumn}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  {columns.map(c => <option key={c.name} value={c.name} className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">{c.name} ({c.dtype_group})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#667085] dark:text-[#A0AEC0] mb-1">Problem Formulation</label>
                <select
                  value={problemType}
                  onChange={(e) => setProblemType(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  <option value="regression" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">Regression (Continuous Numerical Target)</option>
                  <option value="binary_classification" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">Binary Classification (2 Discrete Classes)</option>
                  <option value="multiclass_classification" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">Multiclass Classification (3+ Classes)</option>
                </select>
              </div>
            </div>

            {targetColInfo && (
              <div className="text-[11px] text-[#667085] dark:text-[#A0AEC0] flex items-center space-x-3 pt-1 border-t border-[#E5E9F0] dark:border-[#2B3A50]">
                <span>Distinct Values: <b>{targetColInfo.unique_count}</b></span>
                <span>Missing: <b>{targetColInfo.missing_count} ({targetColInfo.missing_pct}%)</b></span>
                <span>Type: <b>{targetColInfo.dtype}</b></span>
              </div>
            )}
          </div>

          {/* 2. Imbalance Handling (for classification) */}
          {problemType.includes('class') && (
            <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-[#D99A32]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#172033] dark:text-white">
                    Class Imbalance Remediation
                  </span>
                </div>
                <label className="flex items-center space-x-1.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableImbalance}
                    onChange={(e) => setEnableImbalance(e.target.checked)}
                    className="rounded text-[#3157A4]"
                  />
                  <span>Enable Resampling</span>
                </label>
              </div>

              {enableImbalance && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-[#667085] dark:text-[#A0AEC0] mb-1">Resampling Strategy</label>
                    <select
                      value={imbalanceStrategy}
                      onChange={(e) => setImbalanceStrategy(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                    >
                      <option value="smote" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">SMOTE (Synthetic Minority Over-sampling)</option>
                      <option value="adasyn" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">ADASYN (Adaptive Synthetic)</option>
                      <option value="undersample" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">Random Under-sampling (Majority Pruning)</option>
                    </select>
                  </div>
                  <div className="p-2 rounded-lg bg-[#F5F7FA] dark:bg-[#1D2B40] text-[11px] text-[#667085] dark:text-[#A0AEC0] flex items-center">
                    Applies strictly on training folds to prevent validation leakage.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Algorithm Selection */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3157A4] dark:text-[#7899D4]">
                2. Algorithm Selection ({selectedModels.length} selected)
              </span>
              <div className="flex space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedModels(availableModels.map(m => m.key))}
                  className="text-[#3157A4] font-medium hover:underline text-[11px]"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedModels(availableModels.slice(0, 3).map(m => m.key))}
                  className="text-[#667085] font-medium hover:underline text-[11px]"
                >
                  Top 3
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableModels.map((m) => {
                const isChecked = selectedModels.includes(m.key);
                return (
                  <div
                    key={m.key}
                    onClick={() => toggleModelSelection(m.key)}
                    className={`p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors flex items-center space-x-2 ${
                      isChecked
                        ? 'border-[#3157A4] bg-[#3157A4]/5 text-[#3157A4] dark:text-[#7899D4]'
                        : 'border-[#E5E9F0] dark:border-[#2B3A50] text-[#667085] dark:text-[#A0AEC0] hover:border-slate-300'
                    }`}
                  >
                    {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-[#3157A4] shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                    <span className="truncate">{m.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Cross-Validation & Optuna Tuning */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3157A4] dark:text-[#7899D4]">
              3. Cross-Validation & Hyperparameter Tuning
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#667085] dark:text-[#A0AEC0] mb-1">
                  Holdout Ratio: {Math.round(testSize * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.4"
                  step="0.05"
                  value={testSize}
                  onChange={(e) => setTestSize(parseFloat(e.target.value))}
                  className="w-full accent-[#3157A4]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#667085] dark:text-[#A0AEC0] mb-1">
                  K-Fold CV: {cvFolds} Folds
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={cvFolds}
                  onChange={(e) => setCvFolds(parseInt(e.target.value))}
                  className="w-full accent-[#3157A4]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#667085] dark:text-[#A0AEC0] mb-1">Primary Metric</label>
                <select
                  value={primaryMetric}
                  onChange={(e) => setPrimaryMetric(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  {problemType === 'regression' ? (
                    <>
                      <option value="r2" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">R² (Coefficient of Determination)</option>
                      <option value="rmse" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">RMSE (Root Mean Squared Error)</option>
                      <option value="mae" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">MAE (Mean Absolute Error)</option>
                    </>
                  ) : (
                    <>
                      <option value="f1" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">F1-Score (Weighted)</option>
                      <option value="accuracy" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">Accuracy</option>
                      <option value="roc_auc" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">ROC-AUC</option>
                      <option value="precision" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">Precision</option>
                      <option value="recall" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">Recall</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Optuna Bayesian Optimization Toggle */}
            <div className="p-3 rounded-lg bg-[#F5F7FA] dark:bg-[#1D2B40] border border-[#E5E9F0] dark:border-[#2B3A50] flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs text-[#172033] dark:text-white flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Optuna Bayesian Hyperparameter Optimization</span>
                </div>
                <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-0.5">Automates parameter search across folds.</p>
              </div>

              <div className="flex items-center space-x-2">
                {enableTuning && (
                  <span className="text-xs font-mono text-[#3157A4] font-semibold">{tuningTrials} trials</span>
                )}
                <input
                  type="checkbox"
                  checked={enableTuning}
                  onChange={(e) => setEnableTuning(e.target.checked)}
                  className="rounded text-[#3157A4] w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Feature Inclusion & Launch Card */}
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#172033] dark:text-white">Active Features</span>
              <span className="text-[11px] text-[#667085]">{columns.length - 1 - excludedFeatures.length} included</span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs">
              {columns.filter(c => c.name !== targetColumn).map((col) => {
                const isExcluded = excludedFeatures.includes(col.name);
                return (
                  <div
                    key={col.name}
                    onClick={() => toggleFeatureExclusion(col.name)}
                    className="p-1.5 rounded-lg hover:bg-[#F5F7FA] dark:hover:bg-[#1D2B40] cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span className={`text-[11px] ${isExcluded ? 'line-through text-slate-400' : 'text-[#172033] dark:text-slate-300'}`}>
                      {col.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{col.dtype_group}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Launch Card */}
          <div className="p-5 rounded-xl bg-[#111827] text-white shadow-sm space-y-3 border border-[#1E293B]">
            <h3 className="font-semibold text-sm">Launch Automated Benchmark</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fits independent Scikit-learn pipelines with zero data leakage. Trains {selectedModels.length} models and selects the winner.
            </p>

            {isTraining && (
              <div className="p-2.5 rounded-lg bg-[#172235] space-y-1.5 text-xs">
                <div className="flex items-center space-x-2 text-slate-300 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7899D4]" />
                  <span className="truncate">{trainingStage}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleStartTraining}
              disabled={isTraining}
              className="w-full py-2.5 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              {isTraining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isTraining ? 'Benchmarking Models...' : 'Start AutoML Training'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
