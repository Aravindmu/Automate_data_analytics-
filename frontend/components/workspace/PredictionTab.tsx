'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { PlaySquare, Shuffle, Play, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PredictionTab() {
  const { trainingResult, setActiveTab } = useAppStore();

  const [schema, setSchema] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loadingSchema, setLoadingSchema] = useState<boolean>(false);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<any | null>(null);
  const [actualSampleTarget, setActualSampleTarget] = useState<any | null>(null);

  const bestModel = trainingResult?.best_model;
  const experimentId = bestModel?.experiment_id;

  useEffect(() => {
    if (experimentId) {
      setLoadingSchema(true);
      api.getModelSchema(experimentId).then(res => {
        setSchema(res.input_schema);
        // Initialize defaults
        const initialForm: Record<string, any> = {};
        if (res.input_schema?.numeric) {
          Object.entries(res.input_schema.numeric).forEach(([k, v]: [string, any]) => {
            initialForm[k] = v.median !== undefined ? v.median : 0;
          });
        }
        if (res.input_schema?.categorical) {
          Object.entries(res.input_schema.categorical).forEach(([k, v]: [string, any]) => {
            initialForm[k] = v && v.length > 0 ? v[0] : '';
          });
        }
        setFormData(initialForm);
      }).catch(err => console.error(err)).finally(() => setLoadingSchema(false));
    }
  }, [experimentId]);

  const handleRandomizeSample = async () => {
    if (!experimentId) return;
    try {
      const res = await api.getSampleInput(experimentId);
      if (res.sample_inputs) {
        setFormData(res.sample_inputs);
        setActualSampleTarget(res.actual_target);
      }
    } catch (err: any) {
      alert(`Failed to sample input: ${err.message}`);
    }
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!experimentId) return;
    setIsPredicting(true);
    try {
      const res = await api.predict(experimentId, formData);
      setPredictionResult(res);
    } catch (err: any) {
      alert(`Prediction failed: ${err.message}`);
    } finally {
      setIsPredicting(false);
    }
  };

  if (!bestModel || !experimentId) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <PlaySquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">No trained model available</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">Please train models in Step 6 to enable dynamic prediction testing.</p>
        <button onClick={() => setActiveTab('training')} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md">
          Go to Model Training
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Dynamic Interactive Prediction Studio</h2>
          <p className="text-sm text-slate-500">Live inference powered by winner pipeline: <b>{bestModel.model_name}</b></p>
        </div>

        <div className="flex items-center space-x-2">
          {experimentId && (
            <a
              href={api.getModelArtifactUrl(experimentId)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center space-x-1.5"
              title="Download Model"
            >
              <span>Download Model (.joblib)</span>
            </a>
          )}
          <button
            onClick={() => setActiveTab('model_intelligence')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center space-x-1.5"
          >
            <span>Model Intelligence &rarr;</span>
          </button>
          <button
            onClick={handleRandomizeSample}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center space-x-1.5"
          >
            <Shuffle className="w-3.5 h-3.5 text-purple-600" />
            <span>Randomize Sample</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dynamic Input Form (2 cols) */}
        <form onSubmit={handlePredict} className="lg:col-span-2 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Feature Input Simulator</h3>
              <p className="text-xs text-slate-400">Introspected input schema generated from fitted Scikit-learn ColumnTransformer</p>
            </div>
            {actualSampleTarget !== null && actualSampleTarget !== undefined && (
              <div className="px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-700 dark:text-purple-300">
                Ground Truth Target: {actualSampleTarget}
              </div>
            )}
          </div>

          {loadingSchema ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : schema ? (
            <div className="space-y-6">
              {/* Numeric inputs */}
              {schema.numeric && Object.keys(schema.numeric).length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Continuous Numeric Features</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(schema.numeric).map(([colName, bounds]: [string, any]) => (
                      <div key={colName}>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          <span>{colName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">[{bounds.min} to {bounds.max}]</span>
                        </div>
                        <input
                          type="number"
                          step="any"
                          required
                          value={formData[colName] !== undefined ? formData[colName] : ''}
                          onChange={(e) => setFormData({ ...formData, [colName]: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Categorical inputs */}
              {schema.categorical && Object.keys(schema.categorical).length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Categorical Features</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(schema.categorical).map(([colName, options]: [string, any]) => (
                      <div key={colName}>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{colName}</label>
                        <select
                          value={formData[colName] || ''}
                          onChange={(e) => setFormData({ ...formData, [colName]: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                        >
                          {options.map((opt: string) => (
                            <option key={opt} value={opt} className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">{opt}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isPredicting}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center space-x-2"
            >
              {isPredicting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{isPredicting ? 'Computing Inference...' : 'Predict Result'}</span>
            </button>
          </div>
        </form>

        {/* Prediction Output Card (1 col) */}
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-900/10 space-y-6">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-400">
              <Sparkles className="w-4 h-4" />
              <span>Inference Engine Output</span>
            </div>

            {predictionResult ? (
              <div className="space-y-6">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Model Prediction</span>
                  <div className="text-4xl font-black text-white mt-1">
                    {predictionResult.prediction}
                  </div>
                  {actualSampleTarget !== null && actualSampleTarget !== undefined && (
                    <div className="text-xs text-slate-300 mt-2 flex items-center space-x-1.5">
                      <span className="font-semibold">Actual Target:</span>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">{actualSampleTarget}</span>
                    </div>
                  )}
                </div>

                {predictionResult.confidence && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Model Confidence</span>
                      <span className="font-bold text-emerald-400">{predictionResult.confidence}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${predictionResult.confidence}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Class probabilities if available */}
                {predictionResult.probabilities && (
                  <div className="space-y-2 pt-2 border-t border-slate-700/60">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Class Probabilities</span>
                    {Object.entries(predictionResult.probabilities).map(([cls, prob]: [string, any]) => (
                      <div key={cls} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">{cls}</span>
                          <span className="font-semibold text-white">{prob}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${prob}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <PlaySquare className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-xs">Provide inputs on the left and click "Predict Result".</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
