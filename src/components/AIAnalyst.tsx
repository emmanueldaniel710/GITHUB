/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bot, Sparkles, TrendingUp, TrendingDown, ArrowRight, CornerDownRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { Coin, AnalystReport } from '../types';
import { calculateTechnicalIndicators } from '../utils/marketSim';

interface AIAnalystProps {
  activeCoin: Coin;
  candles: Candle[];
  timeframe: string;
}

// Minimal Candle definition for indicator helper
interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const AIAnalyst: React.FC<AIAnalystProps> = ({
  activeCoin,
  candles,
  timeframe,
}) => {
  const [report, setReport] = useState<AnalystReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  // Helper parser to render markdown summaries in react safely
  const renderSimpleMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2"></div>;

      // Headers ### or ####
      if (trimmed.startsWith('####')) {
        return (
          <h5 key={idx} className="text-xs font-bold text-slate-200 mt-3 mb-1.5 uppercase tracking-wider font-sans border-b border-slate-800 pb-1">
            {trimmed.replace(/^####\s*/, '')}
          </h5>
        );
      }
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={idx} className="text-sm font-bold text-emerald-400 mt-4 mb-2 tracking-tight font-sans">
            {trimmed.replace(/^###\s*/, '')}
          </h4>
        );
      }

      // Bullets *
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        const bulletText = trimmed.replace(/^[\*\-]\s*/, '');
        // Replace bold ** markers
        return (
          <div key={idx} className="flex items-start gap-1.5 py-1 text-xs text-slate-350 leading-relaxed font-sans">
            <CornerDownRight className="w-3.5 h-3.5 text-emerald-500/80 mt-0.5 shrink-0" />
            <span>{parseBoldSyntax(bulletText)}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="text-xs text-slate-350 leading-relaxed font-sans py-1">
          {parseBoldSyntax(trimmed)}
        </p>
      );
    });
  };

  // Helper replacing **bold** matches with <strong>
  const parseBoldSyntax = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-white font-semibold">{part}</strong>;
      }
      return part;
    });
  };

  const fetchAIReport = async () => {
    setLoading(true);
    setError(null);

    const indicators = calculateTechnicalIndicators(candles);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: activeCoin.symbol,
          priceUsd: activeCoin.priceUsd,
          changePercent24Hr: activeCoin.changePercent24Hr,
          timeframe,
          rsi: indicators.rsi,
          macd: { line: indicators.macd.line, signal: indicators.macd.signal },
          ema9: indicators.ema9,
          ema21: indicators.ema21,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status code: ${response.status}`);
      }

      const payload = await response.json();
      setReport(payload.report);
      setIsSimulated(!!payload.isSimulated);
    } catch (err: any) {
      console.error('Failed to retrieve advisory report:', err.message);
      setError(err.message || 'Network lookup failure.');
    } finally {
      setLoading(false);
    }
  };

  const getSignalBadge = (signal: string) => {
    switch (signal.toUpperCase()) {
      case 'BUY':
        return 'bg-emerald-500/10 border border-emerald-500/55 text-emerald-400';
      case 'SELL':
        return 'bg-rose-500/10 border border-rose-500/55 text-rose-400';
      default:
        return 'bg-amber-500/10 border border-amber-500/55 text-amber-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'bullish') return <TrendingUp className="w-5 h-5 text-emerald-400" />;
    if (trend === 'bearish') return <TrendingDown className="w-5 h-5 text-rose-400" />;
    return <Sparkles className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div id="ai-analyst-panel-card" className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-4 flex flex-col gap-4 text-zinc-100 shadow-lg select-none">
      {/* Widget Header Section */}
      <div id="ai-header" className="flex items-center justify-between border-b border-zinc-850 pb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-semibold text-white uppercase text-[11px] tracking-tight">
              Gemini AI Market Advisor
            </h3>
            <p className="text-[10px] text-zinc-500">Professional strategy engine & levels</p>
          </div>
        </div>
        
        {/* Trigger analysis call */}
        <button
          id="btn-request-ai-advisory"
          onClick={fetchAIReport}
          disabled={loading}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#0a0a0b] disabled:text-zinc-600 disabled:border-zinc-850 text-white px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider cursor-pointer transition border border-indigo-505"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Generate Signal
            </>
          )}
        </button>
      </div>

      {error && (
        <div id="ai-error-notice" className="bg-rose-500/10 border border-rose-500/20 text-rose-450 p-3 rounded-lg text-xs font-mono">
          System error: {error}. Simulated calculations active.
        </div>
      )}

      {/* RENDER ADVISORY RESULTS FORM GEMINI */}
      {loading ? (
        <div id="ai-loading-viewport" className="flex flex-col items-center justify-center py-16 text-center select-none">
          <div className="relative flex items-center justify-center">
            <Bot className="w-10 h-10 text-emerald-400 animate-pulse" />
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/10 animate-ping"></span>
          </div>
          <p className="text-xs font-semibold text-slate-300 mt-4">
            Consulting Gemini Intelligence Model...
          </p>
          <p className="text-[10px] text-slate-500 mt-1 italic">
            Scanning candlestick arrays, EMA alignment crossovers and RSI momentum loops
          </p>
        </div>
      ) : report ? (
        <div id="ai-report-body" className="flex flex-col gap-4">
          {/* Signal summary card */}
          <div id="signal-summary" className="grid grid-cols-3 gap-3 bg-[#0a0a0b] p-3.5 rounded-xl border border-zinc-850">
            {/* Primary Action Call */}
            <div className="flex flex-col gap-1 text-center justify-center items-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-semibold">Signal Trigger</span>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold leading-tight uppercase font-mono ${getSignalBadge(report.signal)}`}>
                {report.signal}
              </span>
            </div>

            {/* Signal confidence % */}
            <div className="flex flex-col gap-1 border-l border-zinc-850 text-center justify-center items-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-semibold">Confidence</span>
              <span className="text-base font-bold font-mono text-white leading-tight font-semibold">
                {report.confidence}%
              </span>
            </div>

            {/* Strategic Trend Direction */}
            <div className="flex flex-col gap-1 border-l border-zinc-850 text-center justify-center items-center font-semibold">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-semibold">Outlook</span>
              <div className="flex items-center gap-1 mt-0.5">
                {getTrendIcon(report.trend)}
                <span className="text-xs uppercase font-bold text-zinc-300 font-mono tracking-wide">
                  {report.trend}
                </span>
              </div>
            </div>
          </div>

          {/* Key Supports / Resistances lists */}
          <div id="support-resistance-lists-grid" className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-emerald-500/5 border border-emerald-950/40 p-2.5 rounded-lg font-semibold">
              <span className="text-[9px] text-emerald-400 uppercase font-bold flex items-center gap-1 pb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Support Levels
              </span>
              <div className="flex flex-col gap-1 mt-1 text-zinc-350">
                {report.support.map((val, idx) => (
                  <div key={`sup-${idx}`} className="flex justify-between text-zinc-200">
                    <span>S{idx + 1}:</span>
                    <span>${val.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-rose-500/5 border border-rose-955/40 p-2.5 rounded-lg font-semibold">
              <span className="text-[9px] text-rose-450 uppercase font-bold flex items-center gap-1 pb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Resistance Targets
              </span>
              <div className="flex flex-col gap-1 mt-1 text-zinc-350">
                {report.resistance.map((val, idx) => (
                  <div key={`res-${idx}`} className="flex justify-between text-zinc-200">
                    <span>R{idx + 1}:</span>
                    <span>${val.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Comprehensive Strategy Report */}
          <div id="ai-narrative-box" className="bg-[#0a0a0b]/60 p-3.5 rounded-xl border border-zinc-850/85 overflow-y-auto max-h-[220px] scrollbar-thin">
            {renderSimpleMarkdown(report.analysis)}
          </div>

          {/* Indicators details checklist summary */}
          <div id="technical-indicator-checksums" className="grid grid-cols-3 gap-2 border-t border-zinc-850 pt-3">
            <div className="bg-[#0a0a0b]/45 p-2 rounded text-center border border-zinc-850">
              <div className="text-[8px] uppercase font-mono text-zinc-500 font-semibold">RSI Indicator</div>
              <div className="text-xs font-bold font-mono text-zinc-200 mt-0.5">{report.indicatorSummary.rsi.value}</div>
              <div className="text-[8px] text-zinc-400 mt-0.5 text-center truncate">{report.indicatorSummary.rsi.interpretation}</div>
            </div>

            <div className="bg-[#0a0a0b]/45 p-2 rounded text-center border border-zinc-850">
              <div className="text-[8px] uppercase font-mono text-zinc-500 font-bold">MACD Index</div>
              <div className="text-[10px] font-bold font-mono text-zinc-200 mt-0.5 truncate">
                {report.indicatorSummary.macd.line.toFixed(2)} / {report.indicatorSummary.macd.signal.toFixed(2)}
              </div>
              <div className="text-[8px] text-zinc-400 mt-0.5 truncate">{report.indicatorSummary.macd.interpretation}</div>
            </div>

            <div className="bg-[#0a0a0b]/45 p-2 rounded text-center border border-zinc-850">
              <div className="text-[8px] uppercase font-mono text-zinc-500 font-bold">EMA Crossover</div>
              <div className="text-[9px] font-bold font-mono text-zinc-200 mt-0.5 truncate">
                {report.indicatorSummary.ema.ema9.toFixed(1)} / {report.indicatorSummary.ema.ema21.toFixed(1)}
              </div>
              <div className="text-[8px] text-zinc-450 mt-0.5 truncate">{report.indicatorSummary.ema.trend}</div>
            </div>
          </div>

          {/* Simulated Notice Alert Banner */}
          {isSimulated && (
            <div id="simulated-key-warning" className="bg-[#0a0a0b] border border-amber-500/10 text-amber-500/80 p-2 rounded-lg text-[10px] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                Gemini API Secret is unconfigured. Generated using Technical Sandbox.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div id="ai-blank-state" className="flex flex-col items-center justify-center py-10 text-center font-sans border border-dashed border-zinc-800 rounded-xl bg-[#0a0a0b]/10">
          <Bot className="w-8 h-8 text-indigo-500/40 mb-3 animate-pulse" />
          <h4 className="text-xs font-bold text-zinc-300">Need Market Direction?</h4>
          <p className="text-[10px] text-zinc-500 max-w-[210px] mx-auto mt-1 mb-3.5 leading-snug">
            Trigger Gemini model advisor report to formulate margin entries, liquidation safeguards and resistance floors on the active timeframe.
          </p>
          <button
            id="btn-request-advisory-blank"
            onClick={fetchAIReport}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 border border-indigo-505 text-white font-semibold py-1.5 px-4 rounded-lg cursor-pointer transition"
          >
            Launch Advisory Strategy Report
          </button>
        </div>
      )}

      {/* Advisory disclaimer footer */}
      <div id="ai-analyst-disclaimer" className="text-[8px] text-zinc-650 font-mono leading-relaxed select-text flex flex-col gap-1">
        <span>* ADV_SIMULATOR_DISCLAIMER: Virtual sandbox environment simulation. All entries, funding mechanisms, and recommendations are simulated. Leverages and indices do not map to live trading risk, valid for academic project evaluation only.</span>
      </div>
    </div>
  );
};
