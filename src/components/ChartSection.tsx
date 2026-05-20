/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Eye, EyeOff, Zap, AreaChart, BarChart2, Activity } from 'lucide-react';
import { Candle, Coin, Timeframe } from '../types';
import { calculateTechnicalIndicators } from '../utils/marketSim';

interface ChartSectionProps {
  candles: Candle[];
  activeCoin: Coin;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  predictedSupport?: number[];
  predictedResistance?: number[];
}

export const ChartSection: React.FC<ChartSectionProps> = ({
  candles,
  activeCoin,
  timeframe,
  onTimeframeChange,
  predictedSupport = [],
  predictedResistance = [],
}) => {
  const [showEma, setShowEma] = useState<boolean>(true);
  const [showIndicators, setShowIndicators] = useState<boolean>(true);
  
  // Highlighting hover tooltip state
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [mouseY, setMouseY] = useState<number | null>(null);
  
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Focus on the last 50 candles for readability
  const visibleCandles = useMemo(() => {
    return candles.slice(-50);
  }, [candles]);

  // Dimensions of primary and secondary grids
  const chartWidth = 900;
  const mainChartHeight = 250;
  const volumeChartHeight = 60;
  const marginOffset = { top: 15, right: 75, bottom: 25, left: 15 };
  
  const totalSvgWidth = chartWidth + marginOffset.left + marginOffset.right;
  const totalSvgHeight = mainChartHeight + volumeChartHeight + marginOffset.top + marginOffset.bottom + 25;

  // Track min and max indices to draw accurate grid boundaries
  const priceRange = useMemo(() => {
    if (visibleCandles.length === 0) return { min: 100, max: 200, scaleY: 1 };
    
    let maxVal = -Infinity;
    let minVal = Infinity;
    
    visibleCandles.forEach((candle) => {
      if (candle.high > maxVal) maxVal = candle.high;
      if (candle.low < minVal) minVal = candle.low;
    });

    // Also include AI predicted bounds in view if close to price range
    const currentPrice = parseFloat(activeCoin.priceUsd) || 0;
    const padFactor = 0.02; // 2% padding spacing
    let finalMin = minVal * (1 - padFactor);
    let finalMax = maxVal * (1 + padFactor);

    // Keep range tight enough
    return {
      min: finalMin,
      max: finalMax,
      delta: finalMax - finalMin,
    };
  }, [visibleCandles, activeCoin]);

  const maxVolume = useMemo(() => {
    if (visibleCandles.length === 0) return 1;
    return Math.max(...visibleCandles.map(c => c.volume), 1);
  }, [visibleCandles]);

  // Compute absolute Y coordinate on canvas for a given price
  const getY = (price: number): number => {
    if (priceRange.delta === 0) return marginOffset.top;
    const ratio = (price - priceRange.min) / priceRange.delta;
    return marginOffset.top + mainChartHeight - (ratio * mainChartHeight);
  };

  // Compute absolute X coordinate for candle index
  const getX = (index: number): number => {
    if (visibleCandles.length <= 1) return marginOffset.left;
    const colWidth = chartWidth / (visibleCandles.length - 1);
    return marginOffset.left + index * colWidth;
  };

  // Indicator math computations
  const emaData = useMemo(() => {
    if (visibleCandles.length < 5) return null;
    // Walk over visible list and calculate indicators
    const closes = visibleCandles.map(c => c.close);
    
    const ema9: number[] = [];
    const ema21: number[] = [];
    
    let curE9 = closes[0];
    let curE21 = closes[0];
    const k9 = 2 / (9 + 1);
    const k21 = 2 / (21 + 1);

    for (let i = 0; i < closes.length; i++) {
        curE9 = closes[i] * k9 + curE9 * (1 - k9);
        curE21 = closes[i] * k21 + curE21 * (1 - k21);
        ema9.push(curE9);
        ema21.push(curE21);
    }
    return { ema9, ema21 };
  }, [visibleCandles]);

  // Secondary RSI Indicator values
  const rsiAndMacd = useMemo(() => {
    return calculateTechnicalIndicators(candles);
  }, [candles]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current || visibleCandles.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert pixel coordinates to visibleCandle indices
    const xCoordOnChart = clientX - marginOffset.left;
    const colWidth = chartWidth / (visibleCandles.length - 1);
    
    let index = Math.round(xCoordOnChart / colWidth);
    if (index < 0) index = 0;
    if (index >= visibleCandles.length) index = visibleCandles.length - 1;

    setMouseX(clientX);
    setMouseY(clientY);
    setHoverIndex(index);
    setHoveredCandle(visibleCandles[index]);
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
    setHoverIndex(null);
    setMouseX(null);
    setMouseY(null);
  };

  const currentPrice = parseFloat(activeCoin.priceUsd) || 0;
  const currentPriceY = getY(currentPrice);

  const priceFormat = (val: number) => {
    if (val < 1) return val.toFixed(4);
    if (val < 10) return val.toFixed(3);
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const rsiValue = rsiAndMacd.rsi;

  // Vertical and Horizontal grid markers
  const horizontalGridPrices = useMemo(() => {
    const prices: number[] = [];
    const step = priceRange.delta / 4;
    for (let i = 1; i <= 3; i++) {
      prices.push(priceRange.min + i * step);
    }
    return prices;
  }, [priceRange]);

  return (
    <div id="chart-section-card" className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl p-4 flex flex-col gap-4 text-zinc-100 shadow-md">
      
      {/* Top Telemetry Overlay */}
      <div id="chart-telemetry-header" className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-850 pb-3">
        <div id="active-coin-branding" className="flex items-center gap-3">
          <span className="text-base font-bold text-white flex items-center gap-1.5 font-sans">
            {activeCoin.name}
            <span className="text-[10px] bg-zinc-900 border border-zinc-805 text-indigo-400 px-2 py-0.5 rounded font-mono font-medium">USD</span>
          </span>
          <span className={`text-sm font-mono font-bold ${parseFloat(activeCoin.changePercent24Hr) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${priceFormat(currentPrice)}
          </span>
          <span className={`text-[11px] font-mono font-medium ${parseFloat(activeCoin.changePercent24Hr) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {parseFloat(activeCoin.changePercent24Hr) >= 0 ? '+' : ''}
            {parseFloat(activeCoin.changePercent24Hr).toFixed(2)}%
          </span>
        </div>

        {/* Dynamic OHLV stats */}
        <div id="live-ohlv-stats" className="text-[11px] font-mono flex items-center gap-3 text-zinc-550">
          {hoveredCandle ? (
            <>
              <span>O: <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>${priceFormat(hoveredCandle.open)}</span></span>
              <span>H: <span className="text-zinc-300 font-semibold">${priceFormat(hoveredCandle.high)}</span></span>
              <span>L: <span className="text-zinc-300 font-semibold">${priceFormat(hoveredCandle.low)}</span></span>
              <span>C: <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>${priceFormat(hoveredCandle.close)}</span></span>
              <span className="hidden lg:inline text-zinc-500">V: <span>{(hoveredCandle.volume).toLocaleString()}</span></span>
            </>
          ) : (
            candles.length > 0 && (
              <>
                <span>O: <span className="text-zinc-400">${priceFormat(candles[candles.length - 1].open)}</span></span>
                <span>H: <span className="text-zinc-400">${priceFormat(candles[candles.length - 1].high)}</span></span>
                <span>L: <span className="text-zinc-400">${priceFormat(candles[candles.length - 1].low)}</span></span>
                <span>C: <span className="text-zinc-455">${priceFormat(candles[candles.length - 1].close)}</span></span>
                <span className="hidden lg:inline text-zinc-500">24H High: <span className="text-emerald-400 font-semibold">${priceFormat(currentPrice * 1.04)}</span></span>
              </>
            )
          )}
        </div>

        {/* Timeframe Selectors & Settings */}
        <div id="chart-selectors" className="flex items-center gap-2">
          {/* Timeframe Buttons */}
          <div className="flex bg-[#0a0a0b] border border-zinc-855 rounded-lg p-0.5 text-xs font-mono">
            {(['1m', '5m', '15m', '1H', '4H', '1D'] as Timeframe[]).map((tf) => (
              <button
                id={`btn-tf-${tf}`}
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2 py-0.5 rounded cursor-pointer transition uppercase text-[10px] tracking-wider font-semibold ${
                  timeframe === tf
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-zinc-800 mx-1"></div>

          {/* Indicators toggler */}
          <button
            id="toggle-ema-layer"
            onClick={() => setShowEma(!showEma)}
            title="Toggle Moving Averages (EMA 9 & 21)"
            className={`p-1.5 rounded-lg border text-xs cursor-pointer flex items-center gap-1 transition ${
              showEma
                ? 'bg-[#121214] border-amber-500/30 text-amber-500 font-bold'
                : 'bg-[#0a0a0b] border-zinc-800 text-zinc-500'
            }`}
          >
            {showEma ? <Eye className="w-3 h-3 text-amber-500" /> : <EyeOff className="w-3 h-3" />}
            <span className="text-[9px] uppercase font-mono">EMA</span>
          </button>

          <button
            id="toggle-rsi-layer"
            onClick={() => setShowIndicators(!showIndicators)}
            title="Toggle Technical Indicators Panel"
            className={`p-1.5 rounded-lg border text-xs cursor-pointer flex items-center gap-1 transition ${
              showIndicators
                ? 'bg-[#121214] border-sky-400/30 text-sky-400 font-bold'
                : 'bg-[#0a0a0b] border-zinc-800 text-zinc-500'
            }`}
          >
            <Activity className="w-3 h-3 text-sky-400" />
            <span className="text-[9px] uppercase font-mono">RSI</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Workspace */}
      <div id="chart-viewport" className="relative w-full overflow-x-auto select-none bg-[#0a0a0b]/40 rounded-xl border border-zinc-850/50">
        <svg
          id="svg-chart-workspace"
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${totalSvgWidth} ${totalSvgHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="min-w-[750px] cursor-crosshair block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Drawing Definitions */}
          <defs>
            <linearGradient id="grid-fade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#27272a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#27272a" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rsi-zone-grad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.05" />
              <stop offset="30%" stopColor="#0ea5e9" stopOpacity="0.01" />
              <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.01" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Horizontal Backdrop Gridlines */}
          {horizontalGridPrices.map((price, idx) => {
            const hY = getY(price);
            return (
              <g key={`grid-y-${idx}`} id={`grid-price-group-${idx}`}>
                <line
                  x1={marginOffset.left}
                  y1={hY}
                  x2={marginOffset.left + chartWidth}
                  y2={hY}
                  stroke="#27272a"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={marginOffset.left + chartWidth + 8}
                  y={hY + 4}
                  fill="#71717a"
                  fontSize="10"
                  fontFamily="monospace"
                  className="text-right align-middle"
                >
                  ${priceFormat(price)}
                </text>
              </g>
            );
          })}

          {/* Historical Order Supports/Resistance Overlays (AI Signal Markers) */}
          {predictedSupport.map((sup, idx) => {
            const supY = getY(sup);
            if (supY < marginOffset.top || supY > marginOffset.top + mainChartHeight) return null;
            return (
              <g key={`ai-supp-${idx}`} id={`ai-supp-lines-${idx}`}>
                <line
                  x1={marginOffset.left}
                  y1={supY}
                  x2={marginOffset.left + chartWidth}
                  y2={supY}
                  stroke="#10b981"
                  strokeWidth="1.2"
                  strokeDasharray="6 4"
                  opacity="0.3"
                />
                <text
                  x={marginOffset.left + 5}
                  y={supY - 4}
                  fill="#10b981"
                  fontSize="8"
                  fontFamily="monospace"
                  opacity="0.5"
                >
                  AI SUPPORT {idx + 1}: ${priceFormat(sup)}
                </text>
              </g>
            );
          })}

          {predictedResistance.map((res, idx) => {
            const resY = getY(res);
            if (resY < marginOffset.top || resY > marginOffset.top + mainChartHeight) return null;
            return (
              <g key={`ai-ress-${idx}`} id={`ai-ress-lines-${idx}`}>
                <line
                  x1={marginOffset.left}
                  y1={resY}
                  x2={marginOffset.left + chartWidth}
                  y2={resY}
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeDasharray="6 4"
                  opacity="0.3"
                />
                <text
                  x={marginOffset.left + 5}
                  y={resY - 4}
                  fill="#ef4444"
                  fontSize="8"
                  fontFamily="monospace"
                  opacity="0.5"
                >
                  AI RESIST {idx + 1}: ${priceFormat(res)}
                </text>
              </g>
            );
          })}

          {/* Active Live Price Level Tracker Bar */}
          <line
            id="live-trend-grid-line"
            x1={marginOffset.left}
            y1={currentPriceY}
            x2={marginOffset.left + chartWidth}
            y2={currentPriceY}
            stroke={parseFloat(activeCoin.changePercent24Hr) >= 0 ? '#10b981' : '#f43f5e'}
            strokeWidth="1.2"
            strokeDasharray="2 3"
            opacity="0.9"
          />
          
          {/* Price Tag Y Axis Label */}
          <rect
            x={marginOffset.left + chartWidth + 2}
            y={currentPriceY - 7.5}
            width={70}
            height={15}
            rx={3}
            fill={parseFloat(activeCoin.changePercent24Hr) >= 0 ? '#10b981' : '#f43f5e'}
            className="animate-pulse"
          />
          <text
            x={marginOffset.left + chartWidth + 37}
            y={currentPriceY + 3.5}
            fill="#020617"
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
          >
            {priceFormat(currentPrice)}
          </text>

          {/* Candlesticks Layer */}
          {visibleCandles.map((candle, idx) => {
            const cX = getX(idx);
            const isGreen = candle.close >= candle.open;
            
            const wHighY = getY(candle.high);
            const wLowY = getY(candle.low);
            const bOpenY = getY(candle.open);
            const bCloseY = getY(candle.close);
            
            const bodyY = Math.min(bOpenY, bCloseY);
            const bodyHeight = Math.max(Math.abs(bOpenY - bCloseY), 1.5);
            
            // 50 candles → chartWidth = 900. Spacing allocation roughly 12px body width
            const bodyWidth = Math.max((chartWidth / visibleCandles.length) * 0.75, 4);

            return (
              <g key={`candle-${idx}`} id={`g-candle-${idx}`}>
                {/* Upper and Lower Wick */}
                <line
                  x1={cX}
                  y1={wHighY}
                  x2={cX}
                  y2={wLowY}
                  stroke={isGreen ? '#34d399' : '#f87171'}
                  strokeWidth="1.5"
                />

                {/* Body Core */}
                <rect
                  x={cX - bodyWidth / 2}
                  y={bodyY}
                  width={bodyWidth}
                  height={bodyHeight}
                  fill={isGreen ? '#10b981' : '#ef4444'}
                  stroke={isGreen ? '#34d399' : '#f87171'}
                  strokeWidth="0.8"
                  rx="1"
                />

                {/* Translucent overlay volume columns */}
                {(() => {
                  const volHeight = (candle.volume / maxVolume) * volumeChartHeight;
                  const volY = marginOffset.top + mainChartHeight + volumeChartHeight - volHeight + 20;

                  return (
                    <rect
                      id={`rec-vol-${idx}`}
                      x={cX - bodyWidth / 2}
                      y={volY}
                      width={bodyWidth}
                      height={volHeight}
                      fill={isGreen ? '#10b981' : '#ef4444'}
                      opacity="0.18"
                    />
                  );
                })()}
              </g>
            );
          })}

          {/* Interactive EMA Lines */}
          {showEma && emaData && (
            <g id="ema-lines-layer" opacity="0.85">
              {/* EMA 9 Polyline */}
              <path
                d={emaData.ema9.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(val)}`).join(' ')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
              {/* EMA 21 Polyline */}
              <path
                d={emaData.ema21.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(val)}`).join(' ')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Time axis labels */}
          {visibleCandles.map((candle, idx) => {
            // Label every 10 candles for cleanliness
            if (idx % 10 !== 0) return null;
            const cX = getX(idx);
            const dateStr = new Date(candle.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <g key={`time-axis-${idx}`} id={`time-axis-group-${idx}`}>
                <line
                  x1={cX}
                  y1={marginOffset.top + mainChartHeight + 10}
                  x2={cX}
                  y2={marginOffset.top + mainChartHeight + volumeChartHeight + 15}
                  stroke="#1e293b"
                  strokeWidth="1"
                  opacity="0.3"
                />
                <text
                  x={cX}
                  y={marginOffset.top + mainChartHeight + volumeChartHeight + 35}
                  fill="#475569"
                  fontSize="8.5"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {dateStr}
                </text>
              </g>
            );
          })}

          {/* SECONDARY PANEL: RSI / TECHNICAL INDICATORS CHART */}
          {showIndicators && (
            <g id="rsi-indicators" transform={`translate(0, ${marginOffset.top + mainChartHeight + volumeChartHeight + 45})`}>
              {/* Box frame */}
              <rect
                x={marginOffset.left}
                y="0"
                width={chartWidth}
                height="45"
                fill="url(#rsi-zone-grad)"
                stroke="#1e293b"
                strokeWidth="1"
                rx="4"
              />
              
              {/* 70/30 gridlines */}
              <line
                x1={marginOffset.left}
                y1="10"
                x2={marginOffset.left + chartWidth}
                y2="10"
                stroke="#ef4444"
                strokeWidth="0.8"
                strokeDasharray="2 3"
                opacity="0.6"
              />
              <line
                x1={marginOffset.left}
                y1="35"
                x2={marginOffset.left + chartWidth}
                y2="35"
                stroke="#10b981"
                strokeWidth="0.8"
                strokeDasharray="2 3"
                opacity="0.6"
              />

              {/* Dynamic text descriptors */}
              <text x={marginOffset.left + chartWidth + 8} y="13" fill="#ef4444" fontSize="8" fontFamily="monospace">70 Overbought</text>
              <text x={marginOffset.left + chartWidth + 8} y="38" fill="#10b981" fontSize="8" fontFamily="monospace">30 Oversold</text>
              
              <text x={marginOffset.left + 8} y="12" fill="#94a3b8" fontSize="8" fontFamily="sans-serif" fontWeight="bold">RSI (14)</text>

              {/* Current actual indicator level line */}
              {(() => {
                const rsiYPercent = (100 - rsiValue) / 100;
                const rsiY = rsiYPercent * 45;
                return (
                  <g id="g-rsi-live-point">
                    <line
                      x1={marginOffset.left}
                      y1={rsiY}
                      x2={marginOffset.left + chartWidth}
                      y2={rsiY}
                      stroke="#818cf8"
                      strokeWidth="1.2"
                      opacity="0.7"
                    />
                    <text x={marginOffset.left + 58} y="12" fill="#818cf8" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                      {rsiValue}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* Live Hover Guides (Crosshair & Highlight values) */}
          {hoveredCandle && mouseX && mouseY && (
            <g id="hover-indicators">
              {/* Vertical Crosshair Gridline */}
              <line
                x1={mouseX}
                y1={marginOffset.top}
                x2={mouseX}
                y2={marginOffset.top + mainChartHeight + (showIndicators ? volumeChartHeight + 60 : volumeChartHeight + 20)}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />

              {/* Horizontal Crosshair Gridline */}
              {mouseY >= marginOffset.top && mouseY <= marginOffset.top + mainChartHeight && (
                <g id="horizontal-cross-grp">
                  <line
                    x1={marginOffset.left}
                    y1={mouseY}
                    x2={marginOffset.left + chartWidth}
                    y2={mouseY}
                    stroke="#64748b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  {/* Floating mouse price badge on standard scale */}
                  {(() => {
                    const pixelsInside = marginOffset.top + mainChartHeight - mouseY;
                    const computedCrossPrice = priceRange.min + (pixelsInside / mainChartHeight) * priceRange.delta;
                    return (
                      <g id="g-cross-price-tag">
                        <rect
                          x={marginOffset.left + chartWidth + 2}
                          y={mouseY - 7}
                          width={75}
                          height={14}
                          rx={3}
                          fill="#334155"
                        />
                        <text
                          x={marginOffset.left + chartWidth + 39}
                          y={mouseY + 3}
                          fill="#f8fafc"
                          fontSize="8.5"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          ${priceFormat(computedCrossPrice)}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Legend / Key Levels Summary */}
      <div id="chart-sub-legend" className="flex items-center justify-between gap-4 text-xs text-zinc-500 border-t border-zinc-850 pt-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
            <span className="w-2.5 h-1 bg-amber-400 rounded"></span>
            EMA 9
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
            <span className="w-2.5 h-1 bg-sky-450 rounded"></span>
            EMA 21
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
            <span className="w-2.5 h-1 bg-indigo-505 rounded"></span>
            RSI Channels
          </span>
          {predictedSupport.length > 0 && (
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-450">
              <span className="w-2 h-2 rounded-full bg-emerald-500/10 border border-emerald-500/40"></span>
              Lumina Forecast Active
            </span>
          )}
        </div>
        <span className="text-[10px] font-sans text-zinc-600 italic hidden sm:inline">
          Live stream connected. Hover to inspect precise tickers.
        </span>
      </div>
    </div>
  );
};
