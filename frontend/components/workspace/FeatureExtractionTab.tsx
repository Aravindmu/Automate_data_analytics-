'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { Layers, Sparkles, CheckSquare, Square, Play, Loader2, ArrowRight, FileText, Calendar, Code } from 'lucide-react';
import { Dataset } from '@/types';

export default function FeatureExtractionTab() {
  const { currentDataset, setCurrentDataset, currentProfile, setDatasets, setActiveTab, setCurrentProfile } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [extractedReport, setExtractedReport] = useState<any | null>(null);

  // Text extraction config
  const [selectedTextCol, setSelectedTextCol] = useState<string>('');
  const [textMethods, setTextMethods] = useState<string[]>(['word_count', 'char_count', 'avg_word_length', 'tfidf']);

  // Datetime extraction config
  const [selectedDateCol, setSelectedDateCol] = useState<string>('');
  const [dateParts, setDateParts] = useState<string[]>(['year', 'month', 'day', 'dayofweek', 'is_weekend', 'quarter']);

  // Polynomial config
  const [selectedPolyCols, setSelectedPolyCols] = useState<string[]>([]);
  const [polyDegree, setPolyDegree] = useState<number>(2);

  // Encoding config
  const [selectedCatCol, setSelectedCatCol] = useState<string>('');
  const [encodingMethod, setEncodingMethod] = useState<'frequency' | 'target'>('frequency');

  const columns = currentProfile?.profiling?.columns || [];
  const numericColumns = columns.filter(c => c.dtype_group === 'numeric').map(c => c.name);
  const textColumns = columns.filter(c => c.dtype_group === 'text' || c.dtype_group === 'categorical').map(c => c.name);
  const dateColumns = columns.filter(c => c.dtype_group === 'datetime' || c.name.toLowerCase().includes('date') || c.name.toLowerCase().includes('time')).map(c => c.name);

  const togglePolyCol = (col: string) => {
    if (selectedPolyCols.includes(col)) {
      setSelectedPolyCols(selectedPolyCols.filter(c => c !== col));
    } else {
      setSelectedPolyCols([...selectedPolyCols, col]);
    }
  };

  const toggleTextMethod = (method: string) => {
    if (textMethods.includes(method)) {
      setTextMethods(textMethods.filter(m => m !== method));
    } else {
      setTextMethods([...textMethods, method]);
    }
  };

  const toggleDatePart = (part: string) => {
    if (dateParts.includes(part)) {
      setDateParts(dateParts.filter(p => p !== part));
    } else {
      setDateParts([...dateParts, part]);
    }
  };

  const buildConfig = () => {
    return {
      text: selectedTextCol ? [{ column: selectedTextCol, methods: textMethods, tfidf_max_features: 5 }] : [],
      datetime: selectedDateCol ? [{ column: selectedDateCol, parts: dateParts }] : [],
      polynomial: selectedPolyCols.length >= 2 ? { columns: selectedPolyCols, degree: polyDegree } : {},
      encoding: selectedCatCol ? [{ column: selectedCatCol, method: encodingMethod }] : []
    };
  };

  const handlePreview = async () => {
    if (!currentDataset) return;
    setPreviewLoading(true);
    try {
      const config = buildConfig();
      const res = await api.extractFeatures(currentDataset.id, config, false);
      setExtractedReport(res.report);
    } catch (err: any) {
      alert(`Feature extraction preview failed: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    if (!currentDataset) return;
    setLoading(true);
    try {
      const config = buildConfig();
      const res = await api.extractFeatures(currentDataset.id, config, true);
      const newDataset: Dataset = res.new_dataset;
      setCurrentDataset(newDataset);
      const dList = await api.getDatasets();
      setDatasets(dList);
      const prof = await api.getDatasetProfile(newDataset.id);
      setCurrentProfile(prof);
      setExtractedReport(res.report);
      alert(`Extraction complete! Created dataset version v${newDataset.version}`);
    } catch (err: any) {
      alert(`Failed to apply feature extraction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!currentDataset) {
    return (
      <div className="p-8 text-center rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50]">
        <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-[#172033] dark:text-white">No dataset selected</h3>
        <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-1 mb-4">Select or ingest a dataset to extract features.</p>
        <button onClick={() => setActiveTab('ingestion')} className="px-4 py-2 rounded-lg bg-[#3157A4] text-white text-xs font-medium">
          Go to Ingestion
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E9F0] dark:border-[#2B3A50]">
        <div>
          <h2 className="text-lg font-semibold text-[#172033] dark:text-white">Feature Extraction Engine</h2>
          <p className="text-xs text-[#667085] dark:text-[#A0AEC0] mt-0.5">
            Derive predictive representations from text, temporal timestamps, polynomials, and categorical frequencies
          </p>
        </div>

        <button
          onClick={() => setActiveTab('feature_selection')}
          className="px-3.5 py-1.5 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white text-xs font-medium shadow-xs transition-colors flex items-center space-x-1.5"
        >
          <span>Next: Feature Selection</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Extraction Modules */}
        <div className="lg:col-span-2 space-y-4">
          {/* Module 1: Text Feature Extraction */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-sm font-semibold text-[#172033] dark:text-white">
              <FileText className="w-4 h-4 text-[#3157A4]" />
              <span>1. Text & Natural Language Features</span>
            </div>
            <p className="text-xs text-[#667085] dark:text-[#A0AEC0]">
              Extract token counts, character lengths, and top TF-IDF n-grams from unstructured or semi-structured columns.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-[#667085] dark:text-[#A0AEC0] mb-1">Text Column</label>
                <select
                  value={selectedTextCol}
                  onChange={(e) => setSelectedTextCol(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  <option value="" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">-- Select Text Column --</option>
                  {textColumns.map(c => <option key={c} value={c} className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#667085] dark:text-[#A0AEC0] mb-1">Extraction Techniques</label>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {['word_count', 'char_count', 'avg_word_length', 'tfidf'].map((method) => {
                    const isChecked = textMethods.includes(method);
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => toggleTextMethod(method)}
                        className={`px-2 py-1 rounded-md border text-xs font-medium transition-colors ${
                          isChecked 
                            ? 'bg-[#3157A4]/10 text-[#3157A4] border-[#3157A4]' 
                            : 'border-[#E5E9F0] dark:border-[#2B3A50] text-[#667085] dark:text-[#A0AEC0]'
                        }`}
                      >
                        {method.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Module 2: Datetime Feature Extraction */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-sm font-semibold text-[#172033] dark:text-white">
              <Calendar className="w-4 h-4 text-[#5278B8]" />
              <span>2. Temporal Datetime Decomposition</span>
            </div>
            <p className="text-xs text-[#667085] dark:text-[#A0AEC0]">
              Parse timestamps into cyclical and calendar features (Year, Month, Day, Weekday, Is Weekend, Quarter).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-[#667085] dark:text-[#A0AEC0] mb-1">Datetime Column</label>
                <select
                  value={selectedDateCol}
                  onChange={(e) => setSelectedDateCol(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E9F0] dark:border-[#2B3A50] bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9] text-xs focus:outline-none focus:ring-1 focus:ring-[#3157A4]"
                >
                  <option value="" className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">-- Select Datetime Column --</option>
                  {(dateColumns.length > 0 ? dateColumns : columns.map(c => c.name)).map(c => (
                    <option key={c} value={c} className="bg-white dark:bg-[#172235] text-[#172033] dark:text-[#F1F5F9]">{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#667085] dark:text-[#A0AEC0] mb-1">Date Components</label>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {['year', 'month', 'day', 'dayofweek', 'is_weekend', 'quarter'].map((part) => {
                    const isChecked = dateParts.includes(part);
                    return (
                      <button
                        key={part}
                        type="button"
                        onClick={() => toggleDatePart(part)}
                        className={`px-2 py-0.5 rounded-md border text-xs font-medium transition-colors ${
                          isChecked 
                            ? 'bg-[#5278B8]/10 text-[#5278B8] border-[#5278B8]' 
                            : 'border-[#E5E9F0] dark:border-[#2B3A50] text-[#667085] dark:text-[#A0AEC0]'
                        }`}
                      >
                        {part}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Module 3: Polynomial Features */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-sm font-semibold text-[#172033] dark:text-white">
              <Code className="w-4 h-4 text-[#16865D]" />
              <span>3. Polynomial Interactions (Degree {polyDegree})</span>
            </div>
            <p className="text-xs text-[#667085] dark:text-[#A0AEC0]">
              Generate non-linear cross-product terms (e.g. $A^2, B^2, A \times B$) to capture interaction effects.
            </p>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#667085] dark:text-[#A0AEC0] font-medium">Select Numeric Columns ({selectedPolyCols.length} selected):</span>
                <span className="text-slate-400">Min 2 columns</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {numericColumns.map((c) => {
                  const isChecked = selectedPolyCols.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => togglePolyCol(c)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        isChecked
                          ? 'bg-[#16865D]/10 text-[#16865D] border-[#16865D]'
                          : 'border-[#E5E9F0] dark:border-[#2B3A50] text-[#667085] dark:text-[#A0AEC0]'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Actions & Summary */}
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A0AEC0]">
              Execute Feature Extraction
            </div>
            <p className="text-xs text-[#667085] dark:text-[#A0AEC0]">
              Preview extracted columns or commit to generate an immutable dataset version with strict audit lineage.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handlePreview}
                disabled={previewLoading}
                className="w-full py-2 rounded-lg bg-[#F5F7FA] dark:bg-[#1D2B40] hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-white font-medium text-xs border border-[#E5E9F0] dark:border-[#2B3A50] transition-colors flex items-center justify-center space-x-1.5"
              >
                {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-[#3157A4]" />}
                <span>Preview Extracted Features</span>
              </button>

              <button
                onClick={handleApply}
                disabled={loading}
                className="w-full py-2 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Commit & Create New Dataset</span>
              </button>
            </div>
          </div>

          {/* Audit Results Card */}
          {extractedReport && (
            <div className="p-5 rounded-xl bg-white dark:bg-[#172235] border border-[#E5E9F0] dark:border-[#2B3A50] shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#16865D]">Extraction Audit</span>
                <span className="text-[#3157A4] font-bold">+{extractedReport.new_features_count} Features</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs text-[#667085] dark:text-[#A0AEC0]">
                {extractedReport.operations.map((op: string, idx: number) => (
                  <div key={idx} className="flex items-start space-x-1.5">
                    <span className="text-[#3157A4] font-bold">&bull;</span>
                    <span>{op}</span>
                  </div>
                ))}
              </div>

              {extractedReport.new_features && extractedReport.new_features.length > 0 && (
                <div className="pt-2 border-t border-[#E5E9F0] dark:border-[#2B3A50]">
                  <span className="text-[11px] font-bold uppercase text-[#667085] dark:text-[#A0AEC0] block mb-1">New Columns:</span>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {extractedReport.new_features.slice(0, 8).map((fn: string) => (
                      <span key={fn} className="px-1.5 py-0.5 rounded bg-[#F5F7FA] dark:bg-[#1D2B40] border border-[#E5E9F0] dark:border-[#2B3A50] text-[#172033] dark:text-white font-mono">
                        {fn}
                      </span>
                    ))}
                    {extractedReport.new_features.length > 8 && (
                      <span className="text-[#667085] font-medium">+{extractedReport.new_features.length - 8} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
