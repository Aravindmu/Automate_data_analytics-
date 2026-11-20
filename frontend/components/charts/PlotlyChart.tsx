'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/stores/useAppStore';

// Dynamically import Plot with SSR disabled
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PlotlyChartProps {
  data: any[];
  layout: Record<string, any>;
  className?: string;
  config?: Record<string, any>;
}

export default function PlotlyChart({ data, layout, className = 'w-full h-80', config }: PlotlyChartProps) {
  const [mounted, setMounted] = useState(false);
  const { theme } = useAppStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`flex items-center justify-center bg-[#F5F7FA] dark:bg-[#172235]/50 rounded-xl border border-[#E5E9F0] dark:border-[#2B3A50] ${className}`}>
        <div className="flex items-center space-x-2 text-xs text-[#667085] dark:text-[#A0AEC0]">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-[#3157A4] border-t-transparent animate-spin" />
          <span>Rendering visualization...</span>
        </div>
      </div>
    );
  }

  const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const fontColor = isDark ? '#A0AEC0' : '#667085';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)';
  const titleColor = isDark ? '#F1F5F9' : '#172033';

  const mergedLayout = {
    autosize: true,
    margin: { l: 45, r: 25, t: 40, b: 40 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { family: 'inherit', color: fontColor, size: 11 },
    xaxis: {
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickfont: { color: fontColor, size: 10 },
      title: { font: { color: fontColor, size: 11 } },
      ...(layout?.xaxis || {}),
    },
    yaxis: {
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickfont: { color: fontColor, size: 10 },
      title: { font: { color: fontColor, size: 11 } },
      ...(layout?.yaxis || {}),
    },
    ...layout,
    title: typeof layout?.title === 'string' 
      ? { text: layout.title, font: { color: titleColor, size: 13, family: 'inherit' } }
      : { ...(layout?.title || {}), font: { color: titleColor, size: 13, family: 'inherit' } }
  };

  const defaultConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    ...config,
  };

  return (
    <div className={`w-full relative ${className}`}>
      <Plot
        data={data}
        layout={mergedLayout}
        config={defaultConfig}
        useResizeHandler
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
