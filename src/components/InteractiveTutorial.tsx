/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, X, HelpCircle, BookOpen, AlertCircle, Coins, Heart, GraduationCap } from 'lucide-react';

export interface TutorialStep {
  title: string;
  badge: string;
  concept: string;
  explanation: React.ReactNode;
  elementId: string;
  focusMessage: string;
}

interface InteractiveTutorialProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSkip: () => void;
  walletBalance: number;
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  currentStep,
  onStepChange,
  onComplete,
  onSkip,
  walletBalance,
}) => {
  const steps: TutorialStep[] = [
    {
      title: 'Academy Portfolio Induction',
      badge: 'Step 1 of 7: Start Capital',
      concept: 'Virtual Practice Wallet',
      explanation: (
        <div className="flex flex-col gap-2">
          <p>
            Welcome to the <strong>LuminaEX Trading Academy</strong>! Every aspiring trader starts with a practice vault of <strong>$200.00 USD</strong>.
          </p>
          <p className="text-zinc-400">
            This wallet acts as your safe sandbox. Any profit you make adds to this balance, and any losses subtract from it.
          </p>
          <div className="mt-2 text-emerald-400 font-medium bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/40 text-[11px] flex items-center gap-1.5 leading-snug">
            <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Need more cash? Click the plus sign (+) in the top header anytime to stream an interactive ad and claim +$100.00!</span>
          </div>
        </div>
      ),
      elementId: 'header-balance-widget',
      focusMessage: 'Check your real-time practice balance metrics in this header widget.',
    },
    {
      title: 'Real-time Ticking Price Chart',
      badge: 'Step 2 of 7: Market Fluctuations',
      concept: 'Aesthetic Candlesticks & Technicals',
      explanation: (
        <div className="flex flex-col gap-2">
          <p>
            The chart plots historic price candles ticking live. <strong>Green bars</strong> show price rising; <strong>Red bars</strong> show price falling.
          </p>
          <p className="text-zinc-400">
            Look closely at the top right of the chart: we have added dedicated <strong>Zoom In (+)</strong> and <strong>Zoom Out (-)</strong> options. Use them to tighten or expand the horizontal space to inspect price movements clearly!
          </p>
          <div className="text-amber-400 font-medium bg-amber-950/40 p-2 rounded-lg border border-amber-900/40 text-[11px]">
            💡 Toggle the <strong>EMA</strong> lines for moving average guidance or <strong>RSI</strong> to see if the asset is overbought or oversold!
          </div>
        </div>
      ),
      elementId: 'chart-section-card',
      focusMessage: 'Inspect support levels, zoom indices, and historical trend candlesticks here.',
    },
    {
      title: 'The Liquidity Order Book',
      badge: 'Step 3 of 7: Order Flow',
      concept: 'Bids, Asks, and Market Depth',
      explanation: (
        <div className="flex flex-col gap-2">
          <p>
            Trading is a continuous exchange between buyers and sellers. This panel displays live orders in the active coin:
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-450 text-[11px] mt-1 pl-1">
            <li><span className="text-emerald-400 font-semibold font-mono">Bids (Green):</span> Pending buy orders.</li>
            <li><span className="text-rose-400 font-semibold font-mono">Asks (Red):</span> Pending sell orders.</li>
            <li><span className="text-zinc-250 font-semibold font-mono">Recent Trades:</span> Real-time execution tape.</li>
          </ul>
        </div>
      ),
      elementId: 'orderbook-panel-widget',
      focusMessage: 'Observe buyer demand and seller supply ticking synchronously.',
    },
    {
      title: 'Long vs Short Order Placement',
      badge: 'Step 4 of 7: Order Direction',
      concept: 'Profiting in Both Rising & Falling Markets',
      explanation: (
        <div className="flex flex-col gap-2">
          <p>
            Normal investors can only buy assets and hope the price climbs. On a trading platform, you can profit from <strong>both</strong> directions:
          </p>
          <p className="text-zinc-400">
            🟢 <strong>Buy / Long:</strong> Open this if you believe the price will <strong>rise</strong>.
          </p>
          <p className="text-zinc-400">
            🔴 <strong>Sell / Short:</strong> Open this if you believe the price will <strong>fall</strong>. You borrow and sell high first, planning to buy back cheaper later!
          </p>
        </div>
      ),
      elementId: 'trading-card-form',
      focusMessage: 'Choose between Buy/Long or Sell/Short depending on your market outlook.',
    },
    {
      title: 'Leverage Multipliers',
      badge: 'Step 5 of 7: Power & Risk',
      concept: 'Trading with Borrowed Capital Capacity',
      explanation: (
        <div className="flex flex-col gap-2">
          <p>
            <strong>Leverage</strong> allows you to open large position sizes with a small margin deposit.
          </p>
          <p className="text-zinc-400 font-medium">
            For example, putting down <strong>$50.00 margin</strong> at <strong>10x leverage</strong> gives you a position shape worth <strong>$500.00</strong>.
          </p>
          <div className="text-red-400 font-medium bg-red-950/40 p-2 rounded-lg border border-red-900/45 text-[11px] leading-snug">
            ⚠️ <strong>Warning (Liquidation):</strong> Gains are made on the $500.00 size, but so are losses! If the price moves 10% against you, your $50.00 deposit is completely wiped, triggering an automatic liquidating liquidation event!
          </div>
        </div>
      ),
      elementId: 'trading-card-form',
      focusMessage: 'Adjust your margin collateral and leverage multiplier to balance returns and risks.',
    },
    {
      title: 'The Positions Tracker',
      badge: 'Step 6 of 7: Risk Management',
      concept: 'Monitoring and Stop-Loss Safeguards',
      explanation: (
        <div className="flex flex-col gap-2">
          <p>
            Once you execute an order, your active position is tracked here with live unrealized profit or loss (U.PNL) based on the current spot rate.
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
            <li>Manually close a trade anytime to secure your holdings.</li>
            <li>Use <strong>Stop Loss (SL)</strong> to automatically close a losing trade before losing your whole margin.</li>
            <li>Use <strong>Take Profit (TP)</strong> to automatically close a winning trade at your target price.</li>
          </ul>
        </div>
      ),
      elementId: 'positions-table-widget',
      focusMessage: 'Track active trade yields, and configure SL/TP limits to automate safety.',
    },
    {
      title: 'Graduation & Academy Cash Bonus!',
      badge: 'Step 7 of 7: Graduate Status',
      concept: 'Academic Graduation Complete',
      explanation: (
        <div className="flex flex-col gap-3 py-1">
          <div className="w-16 h-16 bg-indigo-600/20 border-2 border-indigo-500 rounded-full flex items-center justify-center mx-auto text-indigo-400 text-3xl animate-bounce">
            🎓
          </div>
          <p className="text-zinc-200 font-bold text-center text-sm">
            Congratulations, Rookie Trader!
          </p>
          <p className="text-zinc-400 text-center text-[12px] leading-relaxed">
            You now understand how margin, leverage, long/short positions, and risk protections operate. Put your practice to the test immediately.
          </p>
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex flex-col items-center gap-1.5 text-center mt-1 animate-pulse">
            <span className="text-[10px] tracking-widest font-mono text-emerald-400 font-bold uppercase">Academy Incentive Reward</span>
            <div className="text-xl font-bold text-emerald-400">+$100.00 Virtual Capital</div>
            <p className="text-[10px] text-zinc-500 leading-normal">
              We have added a custom $100.00 learning cash bonus value straight to your account balance for finishing the course!
            </p>
          </div>
        </div>
      ),
      elementId: 'header-balance-widget',
      focusMessage: 'Your balance will be topped up with $100.00 upon completing the onboarding!',
    },
  ];

  if (currentStep < 0 || currentStep >= steps.length) return null;

  const activeStep = steps[currentStep];

  // Helper to scroll/re-position scroll focus directly to the component element ID
  useEffect(() => {
    if (activeStep.elementId) {
      const element = document.getElementById(activeStep.elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStep, activeStep.elementId]);

  return (
    <div id="tutorial-tour-overlay" className="fixed inset-0 z-110 pointer-events-none flex flex-col justify-end md:justify-center items-center p-4">
      
      {/* Absolute Backdrop dim underlay (with click blocking only if wanted, though we make the tutorial float elegantly) */}
      <div className="absolute inset-0 bg-[#020204]/70 backdrop-blur-[1px] pointer-events-auto" onClick={onSkip} />

      {/* Primary Floating Tour Instruction Card */}
      <div 
        id="tutorial-interactive-card" 
        className="relative bg-[#121214] border border-indigo-500/50 rounded-2xl max-w-md w-full shadow-2xl p-5 md:p-6 flex flex-col gap-4 text-zinc-100 pointer-events-auto animate-duration-300 animate-slide-up z-120"
      >
        
        {/* Glow accent bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-t-2xl"></div>

        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase">
              Trading Academy Onboarding
            </span>
          </div>
          <button 
            type="button" 
            onClick={onSkip}
            className="text-zinc-500 hover:text-zinc-200 transition cursor-pointer"
            title="Skip Interactive Tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="text-zinc-500 font-mono text-[10px] uppercase font-bold tracking-wider">
            {activeStep.badge}
          </div>
          <h2 className="text-base font-bold font-sans text-white tracking-tight flex items-center gap-1.5">
            {activeStep.title}
          </h2>
          <div className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded self-start font-bold uppercase tracking-wider">
            {activeStep.concept}
          </div>
          <div className="text-zinc-300 text-xs leading-relaxed mt-2.5">
            {activeStep.explanation}
          </div>
        </div>

        {/* Element Highlight Anchor Message */}
        {activeStep.elementId && (
          <div className="bg-[#0a0a0b] border border-indigo-500/30 rounded-xl p-3 flex gap-2.5 items-center mt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
            <p className="text-[11px] text-zinc-400 leading-normal italic">
              <strong>Focus area:</strong> {activeStep.focusMessage}
            </p>
          </div>
        )}

        {/* Bottom Pagination controls */}
        <div className="flex items-center justify-between border-t border-zinc-850 pt-4 mt-1">
          <button
            type="button"
            onClick={onSkip}
            className="text-zinc-550 hover:text-zinc-300 text-xs font-semibold uppercase tracking-wider cursor-pointer"
          >
            Skip Academy
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => onStepChange(currentStep - 1)}
                className="p-2 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => onStepChange(currentStep + 1)}
                className="p-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition ml-1 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onComplete}
                className="p-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-all ml-1 cursor-pointer shadow-lg shadow-emerald-500/20 scale-102"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>GRADUATE NOW</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
