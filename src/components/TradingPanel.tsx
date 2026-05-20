/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, ShieldAlert, AlertTriangle, Play } from 'lucide-react';
import { Coin, PositionType } from '../types';

interface TradingPanelProps {
  activeCoin: Coin;
  walletBalance: number;
  onOpenPosition: (params: {
    type: PositionType;
    margin: number;
    leverage: number;
    limitPrice: number | null;
    stopLoss: number | null;
    takeProfit: number | null;
  }) => void;
}

export const TradingPanel: React.FC<TradingPanelProps> = ({
  activeCoin,
  walletBalance,
  onOpenPosition,
}) => {
  const [tradeType, setTradeType] = useState<PositionType>('long');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPriceInput, setLimitPriceInput] = useState<string>('');
  
  const [marginInput, setMarginInput] = useState<string>('50');
  const [leverage, setLeverage] = useState<number>(10);
  
  const [useSlTp, setUseSlTp] = useState<boolean>(false);
  const [tpInput, setTpInput] = useState<string>('');
  const [slInput, setSlInput] = useState<string>('');
  const [eduOpen, setEduOpen] = useState<boolean>(true);
  
  const currentPrice = parseFloat(activeCoin.priceUsd) || 0;

  // Auto populate limit price or sl/tp reference when active coin toggles
  useEffect(() => {
    setLimitPriceInput(currentPrice.toString());
    setTpInput((currentPrice * (tradeType === 'long' ? 1.15 : 0.85)).toFixed(2));
    setSlInput((currentPrice * (tradeType === 'long' ? 0.93 : 1.07)).toFixed(2));
  }, [activeCoin, tradeType]);

  const margin = parseFloat(marginInput) || 0;
  const limitPrice = orderType === 'limit' ? parseFloat(limitPriceInput) || currentPrice : null;
  const executionPrice = limitPrice || currentPrice;

  // Professional leverage thresholds: Higher leverage → smaller Maintenance Margin Ratio (MMR)
  const getMMR = (lev: number) => {
    if (lev <= 5) return 0.05; // 5% MMR
    if (lev <= 20) return 0.025; // 2.5% MMR
    if (lev <= 50) return 0.01; // 1% MMR
    return 0.005; // 0.5% MMR for 100x!
  };

  const mmr = getMMR(leverage);

  // Position sizing calculations
  const positionValue = margin * leverage;
  const tokensQuantity = positionValue / executionPrice;
  const feePercent = 0.001; // 0.1% trading fee
  const transactionFee = positionValue * feePercent;

  // Liquidation Price formulas
  const liquidationPrice = tradeType === 'long'
    ? executionPrice * (1 - (1 / leverage) + mmr)
    : executionPrice * (1 + (1 / leverage) - mmr);

  const handlePctClick = (percent: number) => {
    const calculated = Math.floor(walletBalance * percent);
    // cap minimum to keep slider healthy
    setMarginInput(Math.max(calculated - 2, 0).toFixed(0));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (margin <= 0) {
      alert('Collateral Margin must be greater than 0');
      return;
    }
    if (margin > walletBalance) {
      alert('Insufficient available wallet balance');
      return;
    }

    const sl = useSlTp ? parseFloat(slInput) || null : null;
    const tp = useSlTp ? parseFloat(tpInput) || null : null;

    onOpenPosition({
      type: tradeType,
      margin,
      leverage,
      limitPrice: orderType === 'limit' ? executionPrice : null,
      stopLoss: sl,
      takeProfit: tp,
    });
  };

  return (
    <div id="trading-card-form" className="bg-[#121214] border border-zinc-800 rounded-xl p-4 flex flex-col w-full shrink-0 text-zinc-100 shadow-lg select-none gap-4">
      {/* Long/Short Tab Buttons */}
      <div id="trade-tabs" className="grid grid-cols-2 p-1 bg-[#0a0a0b] border border-zinc-850 rounded-xl">
        <button
          id="btn-tab-long"
          type="button"
          onClick={() => setTradeType('long')}
          className={`py-2 px-4 rounded-lg font-bold text-xs uppercase cursor-pointer transition flex items-center justify-center gap-1.5 ${
            tradeType === 'long'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10 font-bold'
              : 'text-zinc-450 hover:text-zinc-200'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Long (Buy)
        </button>
        <button
          id="btn-tab-short"
          type="button"
          onClick={() => setTradeType('short')}
          className={`py-2 px-4 rounded-lg font-bold text-xs uppercase cursor-pointer transition flex items-center justify-center gap-1.5 ${
            tradeType === 'short'
              ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/10 font-bold'
              : 'text-zinc-450 hover:text-zinc-205'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" />
          Short (Sell)
        </button>
      </div>

      <form id="order-entry-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Order type button group */}
        <div id="order-type-tabs" className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setOrderType('market')}
            className={`flex-1 py-1 px-3 border rounded text-center cursor-pointer transition uppercase text-[10px] font-semibold ${
              orderType === 'market'
                ? 'bg-[#0c0c0e] border-indigo-505 text-white font-bold'
                : 'border-zinc-850 text-zinc-500 hover:text-zinc-350 bg-[#0a0a0b]'
            }`}
          >
            Market Order
          </button>
          <button
            type="button"
            onClick={() => setOrderType('limit')}
            className={`flex-1 py-1 px-3 border rounded text-center cursor-pointer transition uppercase text-[10px] font-semibold ${
              orderType === 'limit'
                ? 'bg-[#0c0c0e] border-indigo-505 text-white font-bold'
                : 'border-zinc-850 text-zinc-500 hover:text-zinc-350 bg-[#0a0a0b]'
            }`}
          >
            Limit Order
          </button>
        </div>        {/* Limit Price Input if type = Limit */}
        {orderType === 'limit' && (
          <div id="limit-price-input-box" className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase text-zinc-400 font-mono tracking-wider font-semibold">
              Trigger Price (USD)
            </label>
            <input
              id="input-limit-price"
              type="number"
              step="any"
              value={limitPriceInput}
              onChange={(e) => setLimitPriceInput(e.target.value)}
              className="w-full bg-[#0a0a0b] border border-zinc-800 rounded-lg py-2 px-3 text-zinc-200 font-mono text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/[0.2]"
            />
          </div>
        )}

        {/* Leverage Slider component */}
        <div id="leverage-slider-box" className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px]">
            <span className="uppercase text-zinc-400 font-mono tracking-wider font-semibold">
              Leverage Multiple
            </span>
            <span className="font-mono font-bold text-amber-500">
              {leverage}x
            </span>
          </div>
          <input
            id="leverage-range"
            type="range"
            min="2"
            max="100"
            step={leverage < 20 ? 1 : leverage < 50 ? 5 : 10}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1 bg-[#0a0a0b] rounded outline-none"
          />
          {/* Quick preset multiples */}
          <div id="leverage-presets" className="flex justify-between items-center text-[9px] text-zinc-500 font-mono mt-0.5 font-semibold">
            {[2, 10, 20, 50, 100].map((val) => (
              <button
                key={`lev-${val}`}
                type="button"
                onClick={() => setLeverage(val)}
                className={`cursor-pointer ${leverage === val ? 'text-amber-500 font-bold' : 'hover:text-zinc-350'}`}
              >
                {val}x
              </button>
            ))}
          </div>
        </div>

        {/* Collateral Margin (Funding Collateral) Input */}
        <div id="collateral-margin-input-box" className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] uppercase text-zinc-400 font-mono font-semibold">
            <span>Collateral (USD)</span>
            <span>Max: ${walletBalance.toFixed(1)}</span>
          </div>
          <div className="relative">
            <input
              id="input-margin-usd"
              type="number"
              min="1"
              value={marginInput}
              onChange={(e) => setMarginInput(e.target.value)}
              className="w-full bg-[#0a0a0b] border border-zinc-800 rounded-lg py-2 pl-3 pr-12 text-zinc-200 font-mono text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/[0.2]"
            />
            <span className="absolute right-3 top-2.5 text-xs text-zinc-550 font-mono font-semibold">USD</span>
          </div>
          {/* Quick percentage distribution buttons */}
          <div id="margin-presets" className="grid grid-cols-4 gap-1.5 mt-1 text-[10px] font-mono">
            {[0.25, 0.50, 0.75, 1.00].map((pct) => (
              <button
                key={`pct-${pct}`}
                type="button"
                onClick={() => handlePctClick(pct)}
                className="py-1 px-2 text-center rounded bg-[#0a0a0b] border border-zinc-850 text-zinc-450 hover:text-white hover:border-zinc-700 transition cursor-pointer font-semibold"
              >
                {pct * 100}%
              </button>
            ))}
          </div>
        </div>

        {/* TP / SL Advanced Option Overlay */}
        <div id="tpsl-config-block" className="border-t border-zinc-850 pt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useSlTp}
              onChange={(e) => setUseSlTp(e.target.checked)}
              className="rounded accent-indigo-500 h-3.5 w-3.5 border-zinc-800 bg-[#0a0a0b]"
            />
            <span className="text-xs text-zinc-350 font-medium font-sans">
              TP / SL Protections
            </span>
          </label>

          {useSlTp && (
            <div id="tpsl-inputs-grid" className="grid grid-cols-2 gap-2 text-xs font-mono mt-1">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-zinc-500 uppercase font-bold">Take Profit (USD)</span>
                <input
                  type="number"
                  step="any"
                  value={tpInput}
                  onChange={(e) => setTpInput(e.target.value)}
                  className="bg-[#0a0a0b] border border-zinc-850 px-2.5 py-1.5 rounded text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-zinc-500 uppercase font-bold">Stop Loss (USD)</span>
                <input
                  type="number"
                  step="any"
                  value={slInput}
                  onChange={(e) => setSlInput(e.target.value)}
                  className="bg-[#0a0a0b] border border-zinc-850 px-2.5 py-1.5 rounded text-rose-400 font-mono text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Margin trade execution outputs details */}
        <div id="trade-details-box" className="bg-[#0a0a0b] rounded-xl p-3 border border-zinc-850 text-zinc-450 text-xs font-mono flex flex-col gap-2 shadow-inner">
          <div className="flex justify-between">
            <span>Position Size</span>
            <span className="text-zinc-200">
              {tokensQuantity.toFixed(4)} {activeCoin.symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Nominal Value</span>
            <span className="text-zinc-200">${positionValue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-rose-400 font-medium">
            <span className="flex items-center gap-1 text-[10px] uppercase font-bold">
              <ShieldAlert className="w-3 h-3 text-rose-450" />
              Est. Liquidation
            </span>
            <span className="font-bold">
              ${liquidationPrice < 0 ? '0.00' : liquidationPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Trading Fee (0.1%)</span>
            <span>${transactionFee.toFixed(2)}</span>
          </div>

          {/* High Leverage Alert if above 25x */}
          {leverage >= 25 && (
            <div className="mt-1 bg-rose-950/20 border border-rose-900/30 rounded p-1.5 flex items-start gap-1.5 text-[10px] text-rose-450 select-none">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-bounce text-rose-450" />
              <span>
                Leverage risk warning! Minor {((1 / leverage) * 100).toFixed(1)}% market changes trigger instant leverage liquidation.
              </span>
            </div>
          )}
        </div>

        {/* Submit Execution Action Button */}
        <button
          id="btn-execute-margin-trade"
          type="submit"
          className={`w-full py-2.5 px-4 rounded-xl cursor-pointer font-bold text-slate-950 hover:brightness-110 uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md ${
            tradeType === 'long'
              ? 'bg-emerald-400 shadow-emerald-500/10'
              : 'bg-rose-400 shadow-rose-500/10'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-slate-950" />
          Open {tradeType === 'long' ? 'Buy / Long' : 'Sell / Short'}
        </button>
      </form>

      {/* 💡 Trader Education Guide Accordion */}
      <div id="trader-education-accordion" className="mt-2 border-t border-zinc-850 pt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setEduOpen(!eduOpen)}
          className="w-full text-left flex items-center justify-between text-xs font-bold text-indigo-400 hover:text-indigo-300 transition uppercase tracking-wider font-sans cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <span>💡</span> Trader Education Guide
          </span>
          <span className="font-mono text-[9px] bg-[#0a0a0b] border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold">
            {eduOpen ? 'HIDE' : 'LEARN'}
          </span>
        </button>

        {eduOpen && (
          <div className="flex flex-col gap-3 text-[11px] text-zinc-400 mt-1 font-sans leading-relaxed animate-fade-in">
            {/* Long vs Short */}
            <div className="bg-[#0a0a0b]/80 rounded-lg p-3 border border-zinc-850 flex flex-col gap-2">
              <div className="font-bold text-zinc-200 flex items-center gap-1 text-[11px]">
                <span className="text-emerald-400">Buy / Long</span>
                <span className="text-zinc-600 font-medium">vs</span>
                <span className="text-rose-400">Sell / Short</span>
              </div>
              <p className="text-zinc-400 leading-normal">
                <span className="text-emerald-400 font-semibold uppercase text-[9px]">Buy / Long:</span> Profit when asset prices <strong className="text-zinc-200">climb</strong>. You close to buy back your initial deposit, keeping the cash gains!
              </p>
              <p className="text-zinc-400 leading-normal">
                <span className="text-rose-400 font-semibold uppercase text-[9px]">Sell / Short:</span> Profit when asset prices <strong className="text-zinc-200">drop</strong>! You borrow and sell high first, planning to purchase back cheaper later. You pocket the difference as profit.
              </p>
            </div>

            {/* How Leverage Works */}
            <div className="bg-[#0a0a0b]/80 rounded-lg p-3 border border-zinc-850 flex flex-col gap-1.5">
              <div className="font-bold text-zinc-250 flex items-center gap-1">
                <span>📈</span>
                <span>Leverage Mechanics</span>
              </div>
              <p className="text-zinc-400 leading-normal">
                Lets you multiply your trade size to maximize returns. At <span className="text-amber-500 font-bold">10x leverage</span>, a <strong className="text-zinc-200">$20 collateral</strong> gets you a <strong className="text-zinc-200">$200 position shape</strong>.
              </p>
              <div className="text-[10px] text-rose-450 border border-rose-950/40 bg-rose-950/10 p-1.5 rounded leading-snug">
                ⚠️ <strong className="font-bold">Risk warning:</strong> Gains are calculated on the $200 size, but losses are as well! Moving 9.5% against your trade wiped your $20 deposit entirely (Liquidation).
              </div>
            </div>

            {/* Liquidation explained */}
            <div className="bg-[#0a0a0b]/80 rounded-lg p-3 border border-zinc-850 flex flex-col gap-1.5">
              <div className="font-bold text-zinc-250 flex items-center gap-1">
                <span>🛡️</span>
                <span>Margin & Liquidation</span>
              </div>
              <p className="text-zinc-400 leading-normal">
                If the market moves against you and your losses equal your deposit, the system automatically triggers a <strong className="text-rose-400">Forced Liquidation</strong> to prevent negative account balances.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
