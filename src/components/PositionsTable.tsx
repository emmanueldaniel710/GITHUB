/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, XCircle, TrendingUp, HelpCircle, History, CheckCircle, Shield } from 'lucide-react';
import { Position, LimitOrder, TradeLog } from '../types';

interface PositionsTableProps {
  positions: Position[];
  limitOrders: LimitOrder[];
  tradeLogs: TradeLog[];
  onClosePosition: (id: string) => void;
  onCancelOrder: (id: string) => void;
}

type TabType = 'positions' | 'orders' | 'logs';

export const PositionsTable: React.FC<PositionsTableProps> = ({
  positions,
  limitOrders,
  tradeLogs,
  onClosePosition,
  onCancelOrder,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('positions');

  const priceFormat = (val: number) => {
    if (val < 1) return val.toFixed(4);
    if (val < 10) return val.toFixed(3);
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div id="positions-table-widget" className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-4 flex flex-col gap-4 text-zinc-100 shadow-lg min-h-[250px]">
      
      {/* Tab select buttons */}
      <div id="positions-table-tabs" className="flex items-center gap-4 border-b border-zinc-850 pb-2">
        <button
          id="btn-tab-active-positions"
          onClick={() => setActiveTab('positions')}
          className={`pb-2 px-1 font-semibold text-xs tracking-tight transition uppercase cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeTab === 'positions'
              ? 'border-indigo-500 text-white font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Active Positions ({positions.length})
        </button>

        <button
          id="btn-tab-limit-orders"
          onClick={() => setActiveTab('orders')}
          className={`pb-2 px-1 font-semibold text-xs tracking-tight transition uppercase cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeTab === 'orders'
              ? 'border-indigo-500 text-white font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Limit Orders ({limitOrders.length})
        </button>

        <button
          id="btn-tab-trade-logs"
          onClick={() => setActiveTab('logs')}
          className={`pb-2 px-1 font-semibold text-xs tracking-tight transition uppercase cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeTab === 'logs'
              ? 'border-indigo-500 text-white font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Trade History ({tradeLogs.length})
        </button>
      </div>

      {/* ACTIVE MARGIN POSITIONS TAB */}
      {activeTab === 'positions' && (
        <div id="active-positions-view" className="overflow-x-auto">
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-550 text-sm italic">
              <Shield className="w-8 h-8 text-zinc-800 mb-2" />
              No active margin positions. Use the order panel to open one!
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-zinc-850 text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">
                  <th className="pb-3 text-zinc-400 font-semibold">Position</th>
                  <th className="pb-3 text-zinc-400 font-semibold">Leverage</th>
                  <th className="pb-3 text-zinc-400 font-semibold">Margin (USD)</th>
                  <th className="pb-3 text-zinc-400 font-semibold">Entry Price</th>
                  <th className="pb-3 text-zinc-400 font-semibold">Mark Price</th>
                  <th className="pb-3 text-rose-500 font-semibold">Liq. Price</th>
                  <th className="pb-3 text-zinc-400 font-semibold">Unrealized PNL</th>
                  <th className="pb-3 text-right text-zinc-400 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/55">
                {positions.map((pos) => {
                  // Net calculation PnL
                  // Long: (Current Price - Entry Price) * Size
                  // Short: (Entry Price - Current Price) * Size
                  const pnl = pos.type === 'long'
                    ? (pos.currentPrice - pos.entryPrice) * pos.size
                    : (pos.entryPrice - pos.currentPrice) * pos.size;
                  
                  const pnlPercent = (pnl / pos.margin) * 100;
                  const isPositive = pnl >= 0;

                  return (
                    <tr key={pos.id} className="text-xs hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3.5 font-bold">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-1 h-6 rounded-full ${pos.type === 'long' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <div className="flex flex-col">
                            <span className="text-zinc-100 font-sans text-sm font-semibold">{pos.coinSymbol}/USD</span>
                            <span className={`text-[9px] uppercase font-mono font-extrabold tracking-wider ${pos.type === 'long' ? 'text-emerald-400' : 'text-rose-450'}`}>
                              {pos.type}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 font-mono text-amber-500 font-bold text-sm">
                        {pos.leverage}x
                      </td>
                      <td className="py-3.5 font-mono text-zinc-300">
                        ${pos.margin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 font-mono text-zinc-300">
                        ${priceFormat(pos.entryPrice)}
                      </td>
                      <td className="py-3.5 font-mono text-zinc-100">
                        ${priceFormat(pos.currentPrice)}
                      </td>
                      <td className="py-3.5 font-mono text-rose-455 font-semibold">
                        ${pos.liquidationPrice < 0 ? '0.00' : priceFormat(pos.liquidationPrice)}
                      </td>
                      <td className={`py-3.5 font-mono font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-[10px] ml-1.5 font-normal">
                          ({isPositive ? '+' : ''}{pnlPercent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          id={`close-pos-${pos.id}`}
                          onClick={() => onClosePosition(pos.id)}
                          className="px-3 py-1.5 border border-zinc-800 bg-[#0a0a0b] text-rose-400 hover:text-white hover:border-rose-500 hover:bg-rose-950/20 rounded-md text-[10px] font-bold transition cursor-pointer"
                        >
                          Market Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* PENDING LIMIT ORDERS LIST TAB */}
      {activeTab === 'orders' && (
        <div id="limit-orders-view" className="overflow-x-auto">
          {limitOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-550 text-sm italic">
              <CheckCircle className="w-8 h-8 text-zinc-800 mb-2" />
              No pending limit orders. Create limit orders in the trade form.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-zinc-850 text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">
                  <th className="pb-3 text-zinc-400">Asset</th>
                  <th className="pb-3 text-zinc-400">Type</th>
                  <th className="pb-3 text-zinc-400">Limit Price</th>
                  <th className="pb-3 text-zinc-400">Nominal Size</th>
                  <th className="pb-3 text-zinc-400">Leverage</th>
                  <th className="pb-3 text-zinc-400">Required Margin</th>
                  <th className="pb-3 text-right text-zinc-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/55">
                {limitOrders.map((ord) => (
                   <tr key={ord.id} className="text-xs hover:bg-zinc-900/40 transition-colors">
                     <td className="py-3 font-semibold text-zinc-200">
                       {ord.coinSymbol}/USD
                     </td>
                     <td className={`py-3 font-bold uppercase text-[10px] ${ord.type === 'long' ? 'text-emerald-400' : 'text-rose-450'}`}>
                       {ord.type}
                     </td>
                     <td className="py-3 font-mono text-zinc-100 font-semibold">
                       ${priceFormat(ord.limitPrice)}
                     </td>
                     <td className="py-3 font-mono text-zinc-300">
                       {ord.size.toFixed(4)} {ord.coinSymbol}
                     </td>
                     <td className="py-3 font-mono text-amber-500 font-bold">
                       {ord.leverage}x
                     </td>
                     <td className="py-3 font-mono text-zinc-300">
                       ${ord.margin.toLocaleString()}
                     </td>
                     <td className="py-3 text-right">
                       <button
                         id={`cancel-ord-${ord.id}`}
                         onClick={() => onCancelOrder(ord.id)}
                         className="p-1 px-2 border border-zinc-805 hover:border-zinc-700 text-zinc-450 hover:text-white rounded text-[10px] font-mono transition cursor-pointer"
                       >
                         Cancel
                       </button>
                     </td>
                   </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TRADE HISTORY LOG RECORDS TAB */}
      {activeTab === 'logs' && (
        <div id="trade-history-view" className="overflow-x-auto">
          {tradeLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-550 text-sm italic">
              <History className="w-8 h-8 text-zinc-800 mb-2" />
              Trade archives empty. Close active positions to write execution reports!
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-zinc-850 text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">
                  <th className="pb-3 text-zinc-400 font-semibold">Position</th>
                  <th className="pb-3 text-zinc-400 font-semibold">Leverage</th>
                  <th className="pb-3 text-zinc-400 font-semibold">Margin</th>
                  <th className="pb-3 text-zinc-400 font-semibold">Entry Price</th>
                  <th className="pb-3 text-zinc-400 font-semibold">Exit Price</th>
                  <th className="pb-3 text-zinc-400 font-semibold">Closed PnL</th>
                  <th className="pb-3 text-right text-zinc-400 font-semibold">Execution Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/55">
                {tradeLogs.map((log) => {
                  const isPositive = log.pnl >= 0;
                  return (
                    <tr key={log.id} className="text-xs hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="text-zinc-200 font-semibold">{log.coinSymbol}/USD</span>
                          <span className={`text-[9px] uppercase font-bold font-mono ${log.type === 'long' ? 'text-emerald-400' : 'text-rose-455'}`}>
                            {log.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-zinc-300 font-semibold">{log.leverage}x</td>
                      <td className="py-3 font-mono text-zinc-400">${log.margin.toLocaleString()}</td>
                      <td className="py-3 font-mono text-zinc-455">${priceFormat(log.entryPrice)}</td>
                      <td className="py-3 font-mono text-zinc-300">${priceFormat(log.closePrice)}</td>
                      <td className={`py-3 font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}${log.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 font-mono text-right text-zinc-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
