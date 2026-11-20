'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import confetti from 'canvas-confetti';
import { BrainCircuit, Play, CheckSquare, Square, Sliders, Sparkles, Loader2, Trophy, ArrowRight } from 'lucide-react';

export default function TrainingTab() {
  const { currentDataset, currentProfile, setTrainingResult, setActiveTab } = useAppStore();

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
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingStage, setTrainingStage] = useState<string>('');

  const columns = currentProfile?.profiling?.columns || [];

  // Auto-detect target column and problem type when dataset or profile changes
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
          setProblemType('binary_classification');
          setPrimaryMetric('f1');
        }
      }
    }
  }, [currentDataset, currentProfile]);

  // Load available models for selected problem type
  useEffect(() => {
    api.getAvailableModels(problemType).then(res => {
      setAvailableModels(res.models || []);
      // Pre-select top 3 models by default
      const defaultPicks = res.models.slice(0, 3).map(m => m.key);
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
        setProblemType('binary_classification');
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
      alert('Please select at least one algorithm to train.');
      return;
    }

    setIsTraining(true);
    setTrainingStage('Partitioning training and testing sets (leakage-free)...');

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
        excluded_features: excludedFeatures,
        random_state: 42
      };

      setTrainingStage(`Fitting Scikit-learn pipelines & training ${selectedModels.length} models...`);
      const result = await api.trainModels(currentDataset.id, config);
      setTrainingResult(result);

      // Celebrate!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Navigate to evaluation
      setActiveTab('evaluation');
    } catch (err: any) {
      alert(`Model training failed: ${err.message}`);
    } finally {
      setIsTraining(false);
      setTrainingStage('');
    }
  };

  if (!currentDataset) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">No dataset selected</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">Please select a dataset to configure machine learning models.</p>
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
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Machine Learning Configuration & Training</h2>
          <p className="text-sm text-slate-500">Train multi-model benchmarks using leakage-free Scikit-learn pipelines and Optuna tuning</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Setup Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target & Problem Type */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-base">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
              <span>Target & Objective Definition</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Column (Y) *</label>
                <select
                  value={targetColumn}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  {columns.map(c => <option key={c.name} value={c.name} className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">{c.name} ({c.dtype_group})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Problem Type</label>
                <select
                  value={problemType}
                  onChange={(e) => setProblemType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  <option value="regression" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">Regression (Continuous Numerical Target)</option>
                  <option value="binary_classification" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">Binary Classification (2 Discrete Classes)</option>
                  <option value="multiclass_classification" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">Multiclass Classification (3+ Classes)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Algorithm Multi-Selector */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-base">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</span>
                <span>Select Algorithms for Benchmark ({selectedModels.length} selected)</span>
              </div>
              <div className="flex space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedModels(availableModels.map(m => m.key))}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedModels(availableModels.slice(0, 3).map(m => m.key))}
                  className="text-slate-500 font-semibold hover:underline"
                >
                  Top 3
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {availableModels.map((m) => {
                const isChecked = selectedModels.includes(m.key);
                return (
                  <div
                    key={m.key}
                    onClick={() => toggleModelSelection(m.key)}
                    className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center space-x-2 ${
                      isChecked
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {isChecked ? <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                    <span className="truncate">{m.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Validation & Tuning Settings */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-base">
              <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs">3</span>
              <span>Validation Strategy & Hyperparameter Optimization</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Holdout Test Ratio: {Math.round(testSize * 100)}%</label>
                <input
                  type="range"
                  min="0.1"
                  max="0.4"
                  step="0.05"
                  value={testSize}
                  onChange={(e) => setTestSize(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">CV Folds (K-Fold): {cvFolds}</label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={cvFolds}
                  onChange={(e) => setCvFolds(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Primary Ranking Metric</label>
                <select
                  value={primaryMetric}
                  onChange={(e) => setPrimaryMetric(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  {problemType === 'regression' ? (
                    <>
                      <option value="r2">R² (Coefficient of Determination)</option>
                      <option value="rmse">RMSE (Root Mean Squared Error)</option>
                      <option value="mae">MAE (Mean Absolute Error)</option>
                    </>
                  ) : (
                    <>
                      <option value="f1">F1-Score (Weighted)</option>
                      <option value="accuracy">Accuracy</option>
                      <option value="roc_auc">ROC-AUC</option>
                      <option value="precision">Precision</option>
                      <option value="recall">Recall</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                  <span>Optuna Automated Hyperparameter Optimization</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Automates Bayesian parameter search across training folds.</p>
              </div>

              <div className="flex items-center space-x-3">
                {enableTuning && (
                  <span className="text-xs font-semibold text-blue-600">{tuningTrials} trials</span>
                )}
                <input
                  type="checkbox"
                  checked={enableTuning}
                  onChange={(e) => setEnableTuning(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Feature Checklist & Execution */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Feature Inclusion</h3>
              <span className="text-xs text-slate-400">{columns.length - 1 - excludedFeatures.length} active features</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {columns.filter(c => c.name !== targetColumn).map((col) => {
                const isExcluded = excludedFeatures.includes(col.name);
                return (
                  <div
                    key={col.name}
                    onClick={() => toggleFeatureExclusion(col.name)}
                    className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                  >
                    <span className={`font-medium ${isExcluded ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {col.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{col.dtype_group}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Big Launch Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-xl shadow-blue-500/20 space-y-4">
            <h3 className="font-bold text-lg">Train Model Benchmark</h3>
            <p className="text-xs text-blue-100 leading-relaxed">
              Fits independent Scikit-learn pipelines with zero data leakage. Trains {selectedModels.length} models, logs experiments in SQLite, and selects the winner.
            </p>

            {isTraining && (
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-blue-200 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{trainingStage}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-white animate-pulse w-3/4 rounded-full" />
                </div>
              </div>
            )}

            <button
              onClick={handleStartTraining}
              disabled={isTraining}
              className="w-full py-4 rounded-2xl bg-white text-blue-700 font-black text-sm shadow-lg hover:bg-blue-50 transition-all flex items-center justify-center space-x-2"
            >
              {isTraining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{isTraining ? 'Training Models...' : 'Start Training Benchmark'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
