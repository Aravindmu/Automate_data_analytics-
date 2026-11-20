'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  Cpu,
  ArrowRight,
  Sparkles,
  Database,
  ShieldCheck,
  BarChart3,
  SlidersHorizontal,
  BrainCircuit,
  Trophy,
  PlaySquare,
  FileText,
  Layers,
  Filter,
  AlertTriangle,
  Binary,
  Download,
  Zap
} from 'lucide-react';

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.querySelectorAll('.hero-fade'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' }
      );
    }
  }, []);

  const pipelineSteps = [
    { num: '01', title: 'Data Ingestion', desc: 'CSV, Excel, JSON, Parquet & REST API endpoints with SSRF security and secret masking.', icon: Database },
    { num: '02', title: 'Inspection & Profiling', desc: 'Statistical distributions, missing heatmap matrix, and transparent 5-factor deterministic quality scoring.', icon: ShieldCheck },
    { num: '03', title: 'Automated Cleaning', desc: 'Whitespace trimming, KNN/Median imputation, duplicate removal, and IQR/Isolation Forest outliers.', icon: Sparkles },
    { num: '04', title: 'Dynamic EDA Studio', desc: 'Plotly interactive histograms, violins, 3D scatters, PCA projections, and automated chart recommendations.', icon: BarChart3 },
    { num: '05', title: 'Feature Extraction', desc: 'Text TF-IDF & length features, datetime cyclical decomposition, polynomial cross-products, and target encoding.', icon: Layers },
    { num: '06', title: 'Feature Engineering', desc: 'Arithmetic interaction features, log/sqrt/power transforms, and discretization binning.', icon: SlidersHorizontal },
    { num: '07', title: 'Feature Selection', desc: 'Variance thresholding, collinearity pruning, SelectKBest mutual information, and recursive feature elimination.', icon: Filter },
    { num: '08', title: 'Leakage Prevention', desc: 'Pre-training scan for target proxy features, entity identifier memorization, and temporal contamination.', icon: AlertTriangle },
    { num: '09', title: 'Automated ML (AutoML)', desc: 'Automatic problem detection, algorithm benchmarking, SMOTE imbalance handling, and Optuna Bayesian tuning.', icon: BrainCircuit },
    { num: '10', title: 'Benchmark & Evaluation', desc: 'Leaderboards, cross-validation variance, holdout confusion matrices, residual plots, and winner selection.', icon: Trophy },
    { num: '11', title: 'Prediction Studio', desc: 'Auto-generated dynamic forms, holdout row randomizer, real-time prediction, and class probability distribution.', icon: PlaySquare },
    { num: '12', title: 'Model Intelligence', desc: 'SHAP feature attribution, model diagnostics (overfitting gap), worst-case error analysis, and what-if simulation.', icon: Binary },
  ];



  return (
    <div className="min-h-screen bg-[#0D1320] text-slate-100 font-sans selection:bg-[#3157A4] selection:text-white">
      {/* Navbar */}
      <header className="border-b border-[#2B3A50] bg-[#111A2B]/80 backdrop-blur-md sticky top-0 z-30 h-16 flex items-center px-6 lg:px-12 justify-between">
        <div className="flex items-center space-x-3">

          <div>
            <span className="font-bold text-base tracking-tight text-white">
              AutoDataScience
            </span>
          </div>
        </div>



        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white font-medium text-xs shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center space-y-6">


        <h1 className="hero-fade text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto text-white">
          Scientific Data Intelligence from Raw Ingestion to Verified Production Models
        </h1>

        <p className="hero-fade text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Automated data quality grading, dynamic Plotly EDA, feature extraction & selection, data leakage scanning, SMOTE imbalance mitigation, multi-model benchmarking, SHAP attribution, and instant artifact downloads.
        </p>

        <div className="hero-fade flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white font-semibold text-xs shadow-xs transition-colors flex items-center space-x-2"
          >
            <span>Open Studio Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#pipeline"
            className="px-5 py-3 rounded-lg bg-[#172235] hover:bg-[#1D2B40] border border-[#2B3A50] text-slate-200 font-medium text-xs transition-colors"
          >
            Explore 12-Stage Pipeline
          </a>
        </div>

        {/* Live Metrics preview banner */}
        <div className="hero-fade grid grid-cols-2 md:grid-cols-4 gap-3 pt-8 max-w-3xl mx-auto text-left">
          <div className="p-3.5 rounded-xl bg-[#172235] border border-[#2B3A50]">
            <div className="text-xl font-bold text-white">100%</div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">Leakage Prevention</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#172235] border border-[#2B3A50]">
            <div className="text-xl font-bold text-[#22C55E]">20+</div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">ML Algorithms</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#172235] border border-[#2B3A50]">
            <div className="text-xl font-bold text-[#7899D4]">SHAP & LIME</div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">Model Intelligence</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#172235] border border-[#2B3A50]">
            <div className="text-xl font-bold text-amber-400">SMOTE</div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">Imbalance Handling</div>
          </div>
        </div>
      </section>

      {/* 12-Stage Pipeline Section */}
      <section id="pipeline" className="py-16 px-6 max-w-7xl mx-auto border-t border-[#2B3A50]">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-[#3157A4]/10 text-[#7899D4] text-xs font-semibold">
            <Zap className="w-3 h-3" />
            <span>Complete Scientific Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">The 12-Stage Automated Pipeline</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Every step preserves version lineage and executes on real datasets with backend machine learning engines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelineSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="p-5 rounded-xl bg-[#172235] border border-[#2B3A50] hover:border-[#3157A4] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold text-[#7899D4] px-2 py-0.5 rounded bg-[#111A2B] border border-[#2B3A50]">
                      STEP {step.num}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-[#111A2B] text-[#7899D4] flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Downloads & Export Callout */}
      <section className="py-12 px-6 max-w-5xl mx-auto border-t border-[#2B3A50] text-center space-y-4">
        <h3 className="text-lg font-bold text-white">Full Artifact Export & Production Downloads</h3>
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
          Export cleaned datasets (CSV/Parquet), serialized Scikit-learn pipelines (.joblib), executive PDF audit summaries, and multi-sheet Excel analytical workbooks.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <span className="px-3 py-1 rounded-md bg-[#172235] border border-[#2B3A50] text-xs text-[#22C55E] flex items-center space-x-1">
            <Download className="w-3.5 h-3.5" />
            <span>Cleaned Dataset (.csv)</span>
          </span>
          <span className="px-3 py-1 rounded-md bg-[#172235] border border-[#2B3A50] text-xs text-[#7899D4] flex items-center space-x-1">
            <Download className="w-3.5 h-3.5" />
            <span>Trained Pipeline (.joblib)</span>
          </span>
          <span className="px-3 py-1 rounded-md bg-[#172235] border border-[#2B3A50] text-xs text-red-400 flex items-center space-x-1">
            <Download className="w-3.5 h-3.5" />
            <span>Executive PDF Report</span>
          </span>
          <span className="px-3 py-1 rounded-md bg-[#172235] border border-[#2B3A50] text-xs text-emerald-400 flex items-center space-x-1">
            <Download className="w-3.5 h-3.5" />
            <span>Excel Analytical Workbook</span>
          </span>
        </div>
      </section>



      {/* Footer */}
      <footer className="py-10 px-6 border-t border-[#2B3A50] text-center space-y-3">
        <Link
          href="/dashboard"
          className="inline-flex px-6 py-2.5 rounded-lg bg-[#3157A4] hover:bg-[#284685] text-white font-medium text-xs shadow-xs transition-colors items-center space-x-1.5"
        >
          <span>Launch AutoDataScience Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <div className="text-[11px] text-slate-500 pt-3">
          Automated Data Science Platform &bull; Professional UI System &bull; Reproducible Machine Learning
        </div>
      </footer>
    </div>
  );
}
