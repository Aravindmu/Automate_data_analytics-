'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { Trophy, ArrowRight, BarChart3, CheckCircle2, Sliders, PlaySquare } from 'lucide-react';
import PlotlyChart from '@/components/charts/PlotlyChart';

export default function EvaluationTab() {
  const { trainingResult, setActiveTab, setSelectedExperiment } = useAppStore();
  const [selectedModelIdx, setSelectedModelIdx] = useState<number>(0);

  if (!trainingResult || !trainingResult.best_model) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">No trained models yet</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">Please configure and run Step 6 (Model Training) to generate evaluation benchmarks.</p>
        <button onClick={() => setActiveTab('training')} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md">
          Go to Model Training
        </button>
      </div>
    );
  }

  const { best_model, models_comparison, primary_metric, problem_type, execution_time_total } = trainingResult;
  const problemType = problem_type;
  const currentModel = models_comparison[selectedModelIdx] || best_model;

  // Comparison Bar Chart Spec
  const compData = [{
    type: 'bar',
    x: models_comparison.map(m => m.model_name),
    y: models_comparison.map(m => m.metrics[primary_metric] || m.cv_score_mean),
    marker: {
      color: models_comparison.map((_, i) => i === 0 ? '#10b981' : '#3b82f6')
    }
  }];
  const compLayout = {
    title: { text: `Model Benchmark Comparison (${primary_metric.toUpperCase()})`, font: { size: 14 } },
    yaxis: { title: primary_metric.toUpperCase() },
    xaxis: { tickangle: -20 },
    margin: { l: 45, r: 20, t: 40, b: 60 }
  };

  // Feature Importance Chart Spec for Current Selected Model
  const featData = currentModel.feature_importance && currentModel.feature_importance.length > 0 ? [{
    type: 'bar',
    orientation: 'h',
    x: currentModel.feature_importance.slice(0, 10).map(f => f.importance).reverse(),
    y: currentModel.feature_importance.slice(0, 10).map(f => f.feature).reverse(),
    marker: { color: '#6366f1' }
  }] : null;
  const featLayout = {
    title: { text: `Feature Importances - ${currentModel.model_name}`, font: { size: 13 } },
    margin: { l: 110, r: 20, t: 35, b: 35 },
    xaxis: { title: 'Relative Importance' }
  };

  // Confusion matrix spec if available
  const cm = currentModel.metrics?.confusion_matrix;
  const cmData = cm ? [{
    type: 'heatmap',
    z: cm.matrix,
    x: cm.labels,
    y: cm.labels,
    colorscale: 'Blues',
    hoverongaps: false
  }] : null;
  const cmLayout = {
    title: { text: 'Test Holdout Confusion Matrix', font: { size: 13 } },
    xaxis: { title: 'Predicted Class' },
    yaxis: { title: 'Actual Class', autorange: 'reversed' },
    margin: { l: 60, r: 20, t: 35, b: 40 }
  };

  // Residuals spec for regression
  const residuals = currentModel.metrics?.residuals_plot;
  const resData = residuals ? [{
    type: 'scatter',
    mode: 'markers',
    x: residuals.predicted,
    y: residuals.residuals,
    marker: { color: '#ef4444', size: 6, opacity: 0.7 }
  }] : null;
  const resLayout = {
    title: { text: 'Residuals vs Predicted Values', font: { size: 13 } },
    xaxis: { title: 'Predicted Value' },
    yaxis: { title: 'Residual Error (Actual - Pred)' },
    margin: { l: 45, r: 20, t: 35, b: 40 }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Model Evaluation, Leaderboard & Benchmark</h2>
          <p className="text-sm text-slate-500">
            {models_comparison.length} models trained in {execution_time_total}s across {trainingResult.train_size} train / {trainingResult.test_size} test holdout samples
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {best_model?.experiment_id && (
            <a
              href={api.getModelArtifactUrl(best_model.experiment_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center space-x-2"
              title="Download Model Pipeline"
            >
              <span>Download Model (.joblib)</span>
            </a>
          )}
          <button
            onClick={() => setActiveTab('model_intelligence')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all flex items-center space-x-1.5"
          >
            <span>Model Intelligence</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('prediction')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md hover:bg-blue-700 transition-all flex items-center space-x-2"
          >
            <PlaySquare className="w-4 h-4" />
            <span>Launch Prediction Studio</span>
          </button>
        </div>
      </div>

      {/* Winner Trophy Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-md">
            <Trophy className="w-9 h-9 text-yellow-300" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              Benchmark Winner (Highest {primary_metric.toUpperCase()})
            </div>
            <h3 className="text-2xl font-black mt-0.5">{best_model.model_name}</h3>
            <p className="text-xs text-emerald-100 mt-1">
              Cross-Validated Score: <b>{best_model.cv_score_mean} &plusmn; {best_model.cv_score_std}</b> &bull; Train Time: <b>{best_model.training_time}s</b>
              {best_model.tuning_applied && ' &bull; Optuna Bayesian Optimized'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-3xl font-black">{best_model.metrics[primary_metric] || best_model.cv_score_mean}</div>
            <div className="text-[11px] font-bold uppercase text-emerald-200">Test {primary_metric.toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Benchmark Leaderboard</h3>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3 font-bold text-slate-500">Rank</th>
                <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Model Algorithm</th>
                <th className="p-3 font-bold text-slate-700 dark:text-slate-200">{primary_metric.toUpperCase()} (Test)</th>
                <th className="p-3 font-bold text-slate-700 dark:text-slate-200">CV Mean &plusmn; Std</th>
                {problemType === 'regression' ? (
                  <>
                    <th className="p-3 font-bold text-slate-700 dark:text-slate-200">MAE</th>
                    <th className="p-3 font-bold text-slate-700 dark:text-slate-200">RMSE</th>
                  </>
                ) : (
                  <>
                    <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Accuracy</th>
                    <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Precision</th>
                    <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Recall</th>
                  </>
                )}
                <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Train Time</th>
                <th className="p-3 font-bold text-slate-700 dark:text-slate-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
              {models_comparison.map((m, idx) => (
                <tr
                  key={m.model_key}
                  onClick={() => setSelectedModelIdx(idx)}
                  className={`cursor-pointer transition-colors ${
                    selectedModelIdx === idx ? 'bg-blue-50/70 dark:bg-blue-950/40' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <td className="p-3 font-sans">
                    {idx === 0 ? (
                      <span className="w-5 h-5 rounded-full bg-yellow-400 text-slate-900 font-bold flex items-center justify-center text-[10px]">1</span>
                    ) : (
                      <span className="text-slate-400 font-semibold">{idx + 1}</span>
                    )}
                  </td>
                  <td className="p-3 font-bold font-sans text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>{m.model_name}</span>
                    {idx === 0 && <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">Best</span>}
                  </td>
                  <td className="p-3 font-black text-blue-600 dark:text-blue-400">
                    {m.metrics[primary_metric] || m.cv_score_mean}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {m.cv_score_mean} &plusmn; {m.cv_score_std}
                  </td>
                  {problemType === 'regression' ? (
                    <>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{m.metrics.mae || '-'}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{m.metrics.rmse || '-'}</td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{m.metrics.accuracy || '-'}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{m.metrics.precision || '-'}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{m.metrics.recall || '-'}</td>
                    </>
                  )}
                  <td className="p-3 text-slate-500 font-sans">{m.training_time}s</td>
                  <td className="p-3 font-sans">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('prediction');
                      }}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      Predict &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Diagnostic Plots Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metric Comparison Bar Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[350px]">
          <PlotlyChart data={compData} layout={compLayout} className="h-72" />
        </div>

        {/* Feature Importance for Selected Model */}
        {featData ? (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[350px]">
            <PlotlyChart data={featData} layout={featLayout} className="h-72" />
          </div>
        ) : cmData ? (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[350px]">
            <PlotlyChart data={cmData} layout={cmLayout} className="h-72" />
          </div>
        ) : resData ? (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[350px]">
            <PlotlyChart data={resData} layout={resLayout} className="h-72" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
