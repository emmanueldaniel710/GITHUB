/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrendingUp, Wallet, RefreshCw, Bot, Info, BookOpen } from 'lucide-react';
import { Coin } from '../types';

interface HeaderProps {
  coins: Coin[];
  activeCoin: Coin | null;
  onSelectCoin: (coin: Coin) => void;
  walletBalance: number;
  openPositionsPnl: number;
  totalMaintenanceMargin: number;
  onResetAccount: () => void;
  selectedTimeframe: string;
  onSelectTimeframe: (tf: string) => void;
  onTriggerAdEarn: () => void;
  onTriggerTutorial: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  coins,
  activeCoin,
  onSelectCoin,
  walletBalance,
  openPositionsPnl,
  totalMaintenanceMargin,
  onResetAccount,
  selectedTimeframe,
  onSelectTimeframe,
  onTriggerAdEarn,
  onTriggerTutorial,
}) => {
  const accountEquity = walletBalance + openPositionsPnl;
  const positionsPnlIsPositive = openPositionsPnl >= 0;

  // Margin ratio calculation helper
  // Maintenance Margin Ratio can be simulated at 5% of open positions size
  const marginRatio = totalMaintenanceMargin > 0 
    ? (totalMaintenanceMargin / accountEquity) * 100 
    : 0;

  const getMarginHealthText = (ratio: number) => {
    if (ratio === 0) return { label: 'Idle', color: 'text-slate-400' };
    if (ratio < 30) return { label: 'Safe', color: 'text-emerald-400' };
    if (ratio < 75) return { label: 'Medium Risk', color: 'text-amber-400' };
    return { label: 'LIQUIDATION DANGER', color: 'text-rose-400 animate-pulse font-bold' };
  };

  const health = getMarginHealthText(marginRatio);

  return (
    <header id="header-container" className="w-full bg-[#121214] border-b border-zinc-800 text-zinc-300 px-6 py-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shrink-0 shadow-lg">
      {/* Brand Logo & Name */}
      <div id="header-brand-block" className="flex items-center gap-3 shrink-0">
        <div id="logo-icon-wrapper" className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center font-bold text-white text-base font-sans shrink-0 shadow-md shadow-indigo-600/20">
          Λ
        </div>
        <div>
          <h1 id="app-title" className="text-sm font-bold font-sans tracking-tight text-white flex items-center gap-1.5 leading-none">
            <span>LUMINA<span className="text-indigo-400">EX</span></span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-normal">Margin Terminal</span>
            <span id="school-project-badge" className="text-[9px] bg-[#0a0a0b] border border-zinc-800 text-indigo-400 px-2 py-0.5 rounded font-mono font-medium">
              VIRTUAL
            </span>
          </h1>
          <p id="app-subtitle" className="text-[9px] text-zinc-500 font-sans mt-0.5">
            Institutional leverage sandbox & technical advisory suite
          </p>
        </div>
      </div>

      {/* Live Coins Quick Slider */}
      <div id="coin-quick-scroller" className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-zinc-850 flex-1">
        <div id="ticker-label" className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono font-bold shrink-0 mr-1">
          MARKETS:
        </div>
        {coins.slice(0, 5).map((coin) => {
          const coinPrice = parseFloat(coin.priceUsd);
          const change = parseFloat(coin.changePercent24Hr);
          const isActive = activeCoin?.id === coin.id;

          return (
            <button
              id={`ticker-btn-${coin.symbol}`}
              key={coin.id}
              onClick={() => onSelectCoin(coin)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-[11px] cursor-pointer transition shrink-0 font-medium ${
                isActive
                  ? 'bg-[#0a0a0b] border-indigo-500 text-white shadow-sm'
                  : 'bg-[#0c0c0e] border-zinc-850 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/40'
              }`}
            >
              <span className={isActive ? "text-indigo-400 font-bold" : "text-zinc-400"}>{coin.symbol}</span>
              <span className="font-mono text-zinc-100">
                ${coinPrice < 1 ? coinPrice.toFixed(4) : coinPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`font-mono text-[10px] ${change >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}`}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Account Balance Widget */}
      <div id="header-balance-widget" className="grid grid-cols-2 md:flex md:items-center bg-[#0a0a0b] border border-zinc-800 rounded-xl p-3 md:py-2 md:px-4 gap-4 md:gap-5 shrink-0 w-full md:w-auto shadow-inner ml-auto xl:ml-0">
        {/* Wallet Balance */}
        <div id="wallet-balance-box">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-sans flex items-center gap-1">
            <Wallet className="w-2.5 h-2.5 text-indigo-400" />
            Wallet
          </div>
          <div className="font-mono text-xs font-semibold text-white mt-0.5 flex items-center gap-1.5">
            <span>${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <button
              id="btn-trigger-ad-earn"
              onClick={onTriggerAdEarn}
              className="w-4 h-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold text-[11px] leading-none transition-transform active:scale-90 cursor-pointer"
              title="Watch Ad & Earn $100 Free Practice Capital!"
            >
              +
            </button>
          </div>
        </div>

        {/* Account Equity (Wallet + PnL) */}
        <div id="equity-box" className="border-l border-zinc-850 pl-4">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-sans">
            Equity
          </div>
          <div className="font-mono text-xs font-semibold text-white mt-0.5">
            ${accountEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Running PnL */}
        <div id="running-pnl-box" className="border-zinc-850 border-t pt-2 md:pt-0 md:border-t-0 md:border-l md:pl-4">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-sans">
            Active PnL
          </div>
          <div className={`font-mono text-xs font-bold mt-0.5 ${openPositionsPnl > 0 ? 'text-emerald-400' : openPositionsPnl < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
            {openPositionsPnl > 0 ? '+' : ''}${openPositionsPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Margin Risk */}
        <div id="margin-ratio-box" className="border-zinc-850 border-t pt-2 md:pt-0 md:border-t-0 md:border-l md:pl-4">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-sans">
            Margin Risk
          </div>
          <div className="font-mono text-[10px] font-semibold mt-0.5 flex items-center gap-1 leading-none">
            <span className={`${health.color} uppercase text-[9px]`}>{health.label}</span>
            {marginRatio > 0 && (
              <span className="text-zinc-650 text-[9px]">({marginRatio.toFixed(1)}%)</span>
            )}
          </div>
        </div>

        {/* Academy Tutorial Trigger */}
        <button
          id="btn-academy-tour-launch"
          onClick={onTriggerTutorial}
          title="Start Interactive Trading Tour"
          className="col-span-2 md:col-span-1 flex items-center justify-center p-1.5 px-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold hover:border-zinc-700 transition cursor-pointer mt-1 md:mt-0 shadow-md gap-1 bg-gradient-to-r from-indigo-700 to-indigo-600 border border-indigo-500"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Academy Tutorial</span>
        </button>

        {/* Reset Trigger */}
        <button
          id="btn-account-reset"
          onClick={onResetAccount}
          title="Reset Virtual USD Wallet to $200"
          className="col-span-2 md:col-span-1 flex items-center justify-center p-1.5 rounded bg-[#121214] border border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700 transition cursor-pointer mt-1 md:mt-0 animate-pulse text-[10px]"
        >
          <RefreshCw className="w-3.5 h-3.5 md:mr-0 mr-1.5" />
          <span className="md:hidden">Reset Simulator Sandbox</span>
        </button>
      </div>
    </header>
  );
};
