'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { 
  Binary, 
  Activity, 
  PieChart, 
  Sliders, 
  AlertTriangle, 
  Play, 
  Loader2, 
  Shuffle, 
  CheckCircle2, 
  HelpCircle,
  Download,
  ArrowRight
} from 'lucide-react';
import PlotlyChart from '@/components/charts/PlotlyChart';

export default function ModelIntelligenceTab() {
  const { trainingResult, setActiveTab } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<'diagnostics' | 'shap' | 'error' | 'whatif' | 'testing'>('diagnostics');
  const [loading, setLoading] = useState(false);

  // Diagnostics & SHAP data
  const [diagnostics, setDiagnostics] = useState<any | null>(null);
  const [shapData, setShapData] = useState<any | null>(null);
  const [errorData, setErrorData] = useState<any | null>(null);

  // What-If Simulator state
  const [schema, setSchema] = useState<any | null>(null);
  const [baseSample, setBaseSample] = useState<Record<string, any>>({});
  const [varyFeature, setVaryFeature] = useState<string>('');
  const [whatIfCurve, setWhatIfCurve] = useState<any[]>([]);

  // Prediction Testing state
  const [testInputs, setTestInputs] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<any | null>(null);
  const [actualTarget, setActualTarget] = useState<any | null>(null);

  const bestModel = trainingResult?.best_model;
  const experimentId = bestModel?.experiment_id;

  // Load experiment metadata on mount
  useEffect(() => {
    if (experimentId) {
      setLoading(true);

      // Load schema & sample input
      api.getModelSchema(experimentId).then(res => {
        setSchema(res.input_schema);
        if (res.features && res.features.length > 0) {
          setVaryFeature(res.features[0]);
        }
      }).catch(err => console.error(err));

      api.getSampleInput(experimentId).then(sampleRes => {
        if (sampleRes.sample_inputs) {
          setBaseSample(sampleRes.sample_inputs);
          setTestInputs(sampleRes.sample_inputs);
          setActualTarget(sampleRes.actual_target);
        }
      }).catch(err => console.error(err));

      // Load diagnostics
      api.getModelDiagnostics(experimentId).then(d => {
        setDiagnostics(d);
      }).catch(err => console.error(err));

      // Load error analysis
      api.getErrorAnalysis(experimentId).then(e => {
        setErrorData(e);
      }).catch(err => console.error(err));

      // Load SHAP explanations
      api.getExplainability(experimentId).then(s => {
        setShapData(s);
      }).catch(err => console.error(err)).finally(() => setLoading(false));
    }
  }, [experimentId]);

  const handleRandomizeSample = async () => {
    if (!experimentId) return;
    try {
      const res = await api.getSampleInput(experimentId);
      if (res.sample_inputs) {
        setBaseSample(res.sample_inputs);
        setTestInputs(res.sample_inputs);
        setActualTarget(res.actual_target);
      }
    } catch (err: any) {
      alert(`Failed to sample observation: ${err.message}`);
    }
  };

  const handleRunWhatIf = async () => {
    if (!experimentId || !varyFeature) return;
    setLoading(true);
    try {
      const bounds = schema?.numeric?.[varyFeature] || { min: 0, max: 100 };
      const res = await api.whatIfSimulation(experimentId, {
        base_sample: baseSample,
        vary_feature: varyFeature,
        feature_bounds: bounds
      });
      setWhatIfCurve(res.curve || []);
    } catch (err: any) {
      alert(`What-If simulation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!experimentId) return;
    setLoading(true);
    try {
      const res = await api.predict(experimentId, testInputs);
      setTestResult(res);
    } catch (err: any) {
      alert(`Prediction failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!bestModel || !experimentId) {
    return (
      <div className="p-8 text-center rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50]">
        <Binary className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-[#172033] dark:text-white">No trained model available</h3>
        <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-1 mb-4">Please train models in AutoML Studio to access Model Intelligence.</p>
        <button onClick={() => setActiveTab('automl')} className="px-4 py-2 rounded-lg bg-[#3157A4] text-white text-xs font-medium">
          Go to AutoML Studio
        </button>
      </div>
    );
  }

  // SHAP Bar chart spec
  const shapPlotData = shapData?.summary && shapData.summary.length > 0 ? [{
    type: 'bar',
    orientation: 'h',
    x: shapData.summary.slice(0, 10).map((s: any) => s.mean_shap).reverse(),
    y: shapData.summary.slice(0, 10).map((s: any) => s.feature).reverse(),
    marker: { color: '#3157A4' }
  }] : null;

  const shapPlotLayout = {
    title: { text: 'Mean Absolute SHAP Impact (|SHAP| value)', font: { size: 13, color: '#172033' } },
    margin: { l: 110, r: 20, t: 35, b: 35 },
    xaxis: { title: 'Impact on Model Output' }
  };

  // What-If Line chart spec
  const whatIfPlotData = whatIfCurve.length > 0 ? [{
    type: 'scatter',
    mode: 'lines+markers',
    x: whatIfCurve.map(c => c.feature_value),
    y: whatIfCurve.map(c => c.prediction),
    line: { color: '#3157A4', width: 2.5 },
    marker: { size: 6, color: '#5278B8' }
  }] : null;

  const whatIfPlotLayout = {
    title: { text: `Simulated Response Curve (${varyFeature})`, font: { size: 13, color: '#172033' } },
    xaxis: { title: varyFeature },
    yaxis: { title: 'Predicted Outcome' },
    margin: { l: 50, r: 25, t: 35, b: 40 }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Active Model Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#E5E9F0] dark:border-[#2B3A50] gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#172033] dark:text-white">Model Intelligence & Explainability Studio</h2>
          <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-0.5">
            Model diagnostics, SHAP attribution, worst-case error analysis, what-if sensitivity curves, and interactive testing
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="px-2.5 py-1 rounded-md bg-[#3157A4]/10 text-[#3157A4] dark:text-[#7899D4] border border-[#3157A4]/20 text-xs font-semibold">
            Active: {bestModel.model_name}
          </div>
          <a
            href={api.getModelArtifactUrl(experimentId)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#16865D] hover:bg-[#13714e] text-white text-xs font-medium shadow-xs transition-colors flex items-center space-x-1"
            title="Download Model"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.joblib</span>
          </a>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-[#E5E9F0] dark:border-[#2B3A50] text-xs font-medium space-x-6 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('diagnostics')}
          className={`pb-2.5 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeSubTab === 'diagnostics'
              ? 'border-[#3157A4] text-[#3157A4] dark:text-[#7899D4] font-semibold'
              : 'border-transparent text-[#667085] dark:text-[#A0AEC0] hover:text-[#172033]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Model Diagnostics</span>
        </button>

        <button
          onClick={() => setActiveSubTab('shap')}
          className={`pb-2.5 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeSubTab === 'shap'
              ? 'border-[#3157A4] text-[#3157A4] dark:text-[#7899D4] font-semibold'
              : 'border-transparent text-[#667085] dark:text-[#A0AEC0] hover:text-[#172033]'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>SHAP & Feature Attribution</span>
        </button>

        <button
          onClick={() => setActiveSubTab('error')}
          className={`pb-2.5 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeSubTab === 'error'
              ? 'border-[#3157A4] text-[#3157A4] dark:text-[#7899D4] font-semibold'
              : 'border-transparent text-[#667085] dark:text-[#A0AEC0] hover:text-[#172033]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Error Analysis</span>
        </button>

        <button
          onClick={() => setActiveSubTab('whatif')}
          className={`pb-2.5 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeSubTab === 'whatif'
              ? 'border-[#3157A4] text-[#3157A4] dark:text-[#7899D4] font-semibold'
              : 'border-transparent text-[#667085] dark:text-[#A0AEC0] hover:text-[#172033]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>What-If Simulator</span>
        </button>

        <button
          onClick={() => setActiveSubTab('testing')}
          className={`pb-2.5 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeSubTab === 'testing'
              ? 'border-[#3157A4] text-[#3157A4] dark:text-[#7899D4] font-semibold'
              : 'border-transparent text-[#667085] dark:text-[#A0AEC0] hover:text-[#172033]'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Prediction Testing</span>
        </button>
      </div>

      {/* Sub-tab 1: Model Diagnostics */}
      {activeSubTab === 'diagnostics' && (
        <div className="space-y-4">
          {diagnostics ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs">
                <span className="text-[11px] font-bold uppercase text-[#667085] dark:text-[#A0AEC0]">Overfitting Risk</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`text-xl font-bold ${
                    diagnostics.overfit_risk === 'LOW' ? 'text-[#16865D]' : (diagnostics.overfit_risk === 'MODERATE' ? 'text-[#D99A32]' : 'text-[#D94F54]')
                  }`}>
                    {diagnostics.overfit_risk}
                  </span>
                </div>
                <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1.5 leading-relaxed">
                  {diagnostics.overfit_assessment}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs">
                <span className="text-[11px] font-bold uppercase text-[#667085] dark:text-[#A0AEC0]">Generalization Gap</span>
                <div className="text-xl font-bold font-mono text-[#172033] dark:text-white mt-1">
                  {diagnostics.generalization_gap}
                </div>
                <div className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1.5 flex justify-between">
                  <span>Train Score: <b>{diagnostics.train_score}</b></span>
                  <span>Test Score: <b>{diagnostics.test_score}</b></span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs">
                <span className="text-[11px] font-bold uppercase text-[#667085] dark:text-[#A0AEC0]">Cross-Validation Stability</span>
                <div className="text-xl font-bold text-[#3157A4] dark:text-[#7899D4] mt-1">
                  {diagnostics.cv_stability}
                </div>
                <div className="text-[11px] text-[#667085] dark:text-[#A0AEC0] mt-1.5">
                  Standard Deviation: &plusmn;<b>{diagnostics.cv_std}</b> across folds
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">Loading model diagnostics...</div>
          )}
        </div>
      )}

      {/* Sub-tab 2: SHAP Feature Attribution */}
      {activeSubTab === 'shap' && (
        <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white">SHAP (SHapley Additive exPlanations) Global Importance</h3>
            <span className="text-[11px] text-[#667085] dark:text-[#A0AEC0]">Quantifies marginal feature contribution</span>
          </div>

          {shapPlotData ? (
            <PlotlyChart data={shapPlotData} layout={shapPlotLayout} className="h-72" />
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              {shapData?.reason ? `SHAP calculation notice: ${shapData.reason}` : 'Computing SHAP values...'}
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: Error Analysis */}
      {activeSubTab === 'error' && (
        <div className="space-y-4">
          {errorData ? (
            <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs text-[#172033] dark:text-white">
                  {errorData.problem_type === 'regression' ? 'Residual & Worst-Case Error Distribution' : 'Misclassified Observations'}
                </h3>
                {errorData.error_rate_pct !== undefined && (
                  <span className="text-xs font-semibold text-[#D94F54]">Error Rate: {errorData.error_rate_pct}%</span>
                )}
              </div>

              {/* Error Quantiles for Regression */}
              {errorData.error_quantiles && (
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#F5F7FA] dark:bg-[#1D2B40]">
                    <span className="text-[#667085] text-[10px] uppercase font-bold">Mean Error:</span>
                    <div className="font-bold font-mono text-sm mt-0.5">{errorData.mean_error}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F5F7FA] dark:bg-[#1D2B40]">
                    <span className="text-[#667085] text-[10px] uppercase font-bold">Median Error:</span>
                    <div className="font-bold font-mono text-sm mt-0.5">{errorData.median_error}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F5F7FA] dark:bg-[#1D2B40]">
                    <span className="text-[#667085] text-[10px] uppercase font-bold">95th Percentile:</span>
                    <div className="font-bold font-mono text-sm mt-0.5 text-amber-600">{errorData.error_quantiles.q95}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F5F7FA] dark:bg-[#1D2B40]">
                    <span className="text-[#667085] text-[10px] uppercase font-bold">Max Outlier:</span>
                    <div className="font-bold font-mono text-sm mt-0.5 text-[#D94F54]">{errorData.max_error}</div>
                  </div>
                </div>
              )}

              {/* Worst samples table */}
              {errorData.worst_samples && errorData.worst_samples.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F5F7FA] dark:bg-[#1D2B40] border-b border-[#E5E9F0] dark:border-[#2B3A50] text-[#667085]">
                      <tr>
                        <th className="p-2 font-bold">Ground Truth</th>
                        <th className="p-2 font-bold">Model Predicted</th>
                        {errorData.problem_type === 'regression' && <th className="p-2 font-bold">Absolute Error</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E9F0] dark:divide-[#2B3A50] font-mono text-[11px]">
                      {errorData.worst_samples.map((s: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="p-2 font-bold text-[#16865D]">{s.actual}</td>
                          <td className="p-2 font-bold text-[#D94F54]">{s.predicted}</td>
                          {s.abs_error !== undefined && <td className="p-2 text-slate-500">{s.abs_error}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">Loading error analysis...</div>
          )}
        </div>
      )}

      {/* Sub-tab 4: What-If Simulator */}
      {activeSubTab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
            <h3 className="font-semibold text-xs text-[#172033] dark:text-white">What-If Feature Perturbation</h3>
            <p className="text-[11px] text-[#667085] dark:text-[#A0AEC0]">
              Select a feature to sweep across its observed range while holding all other features fixed at baseline.
            </p>

            <div>
              <label className="block text-xs font-medium text-[#667085] dark:text-[#A0AEC0] mb-1">Feature to Vary</label>
              <select
                value={varyFeature}
                onChange={(e) => setVaryFeature(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
              >
                {schema?.numeric && Object.keys(schema.numeric).map(c => (
                  <option key={c} value={c} className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">{c}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunWhatIf}
              disabled={loading || !varyFeature}
              className="w-full py-2 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Simulate Response Curve</span>
            </button>
          </div>

          <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs min-h-[300px]">
            {whatIfPlotData ? (
              <PlotlyChart data={whatIfPlotData} layout={whatIfPlotLayout} className="h-64" />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400">
                <Sliders className="w-8 h-8 opacity-30 mb-2" />
                <span>Select a feature on the left and click "Simulate Response Curve".</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 5: Prediction Testing */}
      {activeSubTab === 'testing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleRunPredict} className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E9F0] dark:border-[#2B3A50]">
              <span className="text-xs font-bold uppercase text-[#172033] dark:text-white">Feature Input Simulator</span>
              <button
                type="button"
                onClick={handleRandomizeSample}
                className="px-2.5 py-1 rounded-md border border-[#E5E9F0] dark:border-[#2B3A50] hover:bg-[#F5F7FA] dark:hover:bg-[#1D2B40] text-xs font-medium text-[#3157A4] dark:text-[#7899D4] flex items-center space-x-1"
              >
                <Shuffle className="w-3 h-3" />
                <span>Sample from Holdout</span>
              </button>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {schema?.numeric && Object.entries(schema.numeric).map(([col, bounds]: [string, any]) => (
                <div key={col}>
                  <div className="flex justify-between text-[11px] font-medium text-[#667085] dark:text-[#A0AEC0] mb-0.5">
                    <span className="truncate">{col}</span>
                    <span className="text-[10px] text-slate-400">[{bounds.min} - {bounds.max}]</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={testInputs[col] !== undefined ? testInputs[col] : ''}
                    onChange={(e) => setTestInputs({ ...testInputs, [col]: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-transparent text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E5E9F0] dark:border-[#2B3A50] flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white font-medium text-xs shadow-xs transition-colors flex items-center space-x-1.5"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Compute Inference</span>
              </button>
            </div>
          </form>

          {/* Prediction Output */}
          <div className="p-5 rounded-xl bg-[#111827] text-white shadow-xs space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Model Prediction</span>

            {testResult ? (
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-black font-mono text-white">{testResult.prediction}</div>
                  {actualTarget !== null && (
                    <div className="text-xs text-slate-400 mt-1">
                      Holdout Ground Truth: <b className="text-[#16865D]">{actualTarget}</b>
                    </div>
                  )}
                </div>

                {testResult.confidence && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Model Confidence:</span>
                      <span className="font-bold text-[#16865D]">{testResult.confidence}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-[#16865D] rounded-full" style={{ width: `${testResult.confidence}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                Click "Compute Inference" to run real-time model prediction.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
