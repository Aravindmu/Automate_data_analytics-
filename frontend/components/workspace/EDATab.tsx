'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import PlotlyChart from '@/components/charts/PlotlyChart';
import { BarChart3, Sparkles, Sliders, Play, Loader2, ArrowRight } from 'lucide-react';
import { ChartSuggestion } from '@/types';

export default function EDATab() {
  const { currentDataset, currentProfile, setActiveTab } = useAppStore();

  const [gallery, setGallery] = useState<ChartSuggestion[]>([]);
  const [chartType, setChartType] = useState<string>('histogram');
  const [xCol, setXCol] = useState<string>('');
  const [yCol, setYCol] = useState<string>('');
  const [zCol, setZCol] = useState<string>('');
  const [colorCol, setColorCol] = useState<string>('');
  const [aggregation, setAggregation] = useState<string>('mean');
  const [chartTitle, setChartTitle] = useState<string>('');
  const [topN, setTopN] = useState<number>(15);

  const [loadingChart, setLoadingChart] = useState<boolean>(false);
  const [chartSpec, setChartSpec] = useState<{ data: any[]; layout: any } | null>(null);

  const columns = currentProfile?.profiling?.columns || [];
  const columnNames = columns.map(c => c.name);
  const numericColumns = columns.filter(c => c.dtype_group === 'numeric').map(c => c.name);

  // Initialize columns and fetch gallery on dataset change
  useEffect(() => {
    if (currentDataset) {
      api.getChartGallery(currentDataset.id).then(res => {
        setGallery(res.suggestions || []);
        if (res.suggestions && res.suggestions.length > 0) {
          applySuggestion(res.suggestions[0]);
        }
      }).catch(err => console.error(err));

      if (columnNames.length > 0 && !xCol) {
        setXCol(columnNames[0]);
        if (columnNames.length > 1) {
          setYCol(columnNames[1]);
        }
      }
    }
  }, [currentDataset]);

  const applySuggestion = async (s: ChartSuggestion) => {
    setChartType(s.chart_type);
    setChartTitle(s.title);
    if (s.x) setXCol(s.x);
    if (s.y) setYCol(s.y);
    if (s.color) setColorCol(s.color);

    // Immediately generate chart
    generateChartWithConfig({
      chart_type: s.chart_type,
      title: s.title,
      x: s.x,
      y: s.y,
      color: s.color,
      aggregation: 'mean',
      top_n: 15
    });
  };

  const generateChartWithConfig = async (configOverride?: any) => {
    if (!currentDataset) return;
    setLoadingChart(true);
    try {
      const config = configOverride || {
        chart_type: chartType,
        x: xCol,
        y: yCol,
        z: zCol,
        color: colorCol || undefined,
        aggregation,
        title: chartTitle || `${chartType.toUpperCase()} Plot`,
        top_n: topN
      };
      const spec = await api.generateChart(currentDataset.id, config);
      setChartSpec(spec);
    } catch (err: any) {
      alert(`Failed to generate chart: ${err.message}`);
    } finally {
      setLoadingChart(false);
    }
  };

  if (!currentDataset) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">No dataset selected</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">Please select a dataset to visualize.</p>
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
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Dynamic Exploratory Data Analysis (EDA)</h2>
          <p className="text-sm text-slate-500">Interactive scientific visualizations generated from actual dataset schema</p>
        </div>

        <button
          onClick={() => setActiveTab('feature_extraction')}
          className="px-4 py-2 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white font-medium text-xs shadow-xs transition-colors flex items-center space-x-1.5"
        >
          <span>Proceed to Step 5: Feature Extraction</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Suggested Gallery Row */}
      {gallery.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span>Automatically Recommended Visualizations</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {gallery.map((s) => (
              <div
                key={s.id}
                onClick={() => applySuggestion(s)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 mb-2">
                    {s.category}
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors line-clamp-1">{s.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.description}</p>
                </div>
                <div className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center space-x-1">
                  <span>Render Plot</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Studio: Controls + Chart Display */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Chart Configuration Controls */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-base">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Chart Controls</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] dark:text-[#A0AEC0] mb-1">Visualization Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
            >
              <option value="histogram">Histogram / Distribution</option>
              <option value="box">Box Plot (Outliers & Quartiles)</option>
              <option value="violin">Violin Plot (KDE + Box)</option>
              <option value="scatter">2D Scatter Plot</option>
              <option value="scatter3d">3D Scatter Plot</option>
              <option value="bar">Bar Chart (Counts / Aggregated)</option>
              <option value="correlation_heatmap">Correlation Matrix Heatmap</option>
              <option value="pca2d">PCA 2D Dimensionality Projection</option>
              <option value="pca3d">PCA 3D Dimensionality Projection</option>
              <option value="timeseries">Time Series Trend Line</option>
            </select>
          </div>

          {/* Conditional axis selectors */}
          {chartType !== 'correlation_heatmap' && chartType !== 'pca2d' && chartType !== 'pca3d' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#667085] dark:text-[#A0AEC0] mb-1">X-Axis Column *</label>
                <select
                  value={xCol}
                  onChange={(e) => setXCol(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {(chartType === 'scatter' || chartType === 'scatter3d' || chartType === 'box' || chartType === 'violin' || chartType === 'bar' || chartType === 'timeseries') && (
                <div>
                  <label className="block text-xs font-semibold text-[#667085] dark:text-[#A0AEC0] mb-1">Y-Axis Column</label>
                  <select
                    value={yCol}
                    onChange={(e) => setYCol(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                  >
                    <option value="">-- None / Count --</option>
                    {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {chartType === 'scatter3d' && (
                <div>
                  <label className="block text-xs font-semibold text-[#667085] dark:text-[#A0AEC0] mb-1">Z-Axis Column *</label>
                  <select
                    value={zCol}
                    onChange={(e) => setZCol(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                  >
                    {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#667085] dark:text-[#A0AEC0] mb-1">Color / Group By (Optional)</label>
                <select
                  value={colorCol}
                  onChange={(e) => setColorCol(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  <option value="">-- None --</option>
                  {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Custom Title</label>
            <input
              type="text"
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              placeholder="e.g. Income vs House Value"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
            />
          </div>

          <button
            onClick={() => generateChartWithConfig()}
            disabled={loadingChart}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
          >
            {loadingChart ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Generate Visualization</span>
          </button>
        </div>

        {/* Right 3 Cols: Interactive Plotly Canvas */}
        <div className="lg:col-span-3 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[500px] flex flex-col justify-center">
          {loadingChart ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-24">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-sm font-semibold text-slate-500">Computing data distribution & Plotly specification...</span>
            </div>
          ) : chartSpec ? (
            <div className="w-full h-full min-h-[450px]">
              <PlotlyChart
                data={chartSpec.data}
                layout={chartSpec.layout}
                className="w-full h-[450px]"
              />
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select chart parameters and click "Generate Visualization" or pick a suggestion from above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
