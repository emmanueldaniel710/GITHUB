/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { OrderBookEntry, Coin } from '../types';

interface OrderBookProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  activeCoin: Coin;
  recentTrades: { id: string; price: number; size: number; side: 'buy' | 'sell'; time: number }[];
}

export const OrderBook: React.FC<OrderBookProps> = ({
  bids,
  asks,
  activeCoin,
  recentTrades,
}) => {
  const currentPrice = parseFloat(activeCoin.priceUsd) || 0;
  const changePercent = parseFloat(activeCoin.changePercent24Hr) || 0;

  // Calculat spreadsheet values
  const spreadDetails = useMemo(() => {
    if (bids.length === 0 || asks.length === 0) return { spread: 0, spreadPercent: 0 };
    const bestBid = bids[0].price;
    const bestAsk = asks[0].price;
    const spread = bestAsk - bestBid;
    const spreadPercent = (spread / bestAsk) * 100;
    return { spread, spreadPercent };
  }, [bids, asks]);

  const priceFormat = (val: number) => {
    if (val < 1) return val.toFixed(4);
    if (val < 10) return val.toFixed(3);
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const sizeFormat = (val: number) => {
    if (val > 1000) return val.toFixed(0);
    if (val > 10) return val.toFixed(2);
    return val.toFixed(4);
  };

  return (
    <div id="orderbook-panel-widget" className="bg-[#121214] border border-zinc-800 rounded-xl p-4 flex flex-col md:w-[320px] shrink-0 text-zinc-100 font-sans shadow-lg gap-4">
      {/* Container header block */}
      <div id="orderbook-header" className="flex items-center gap-2 border-b border-zinc-850 pb-2">
        <Layers className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold tracking-tight text-white uppercase text-[11px]">
          Order Book & Trades
        </h3>
      </div>

      {/* Primary Order depth grid */}
      <div id="orderbook-list-container" className="flex flex-col gap-1.5 flex-1 select-none">
        {/* Table column labels */}
        <div className="grid grid-cols-3 text-[10px] text-zinc-500 font-mono font-bold uppercase border-b border-zinc-850 pb-1">
          <span>Price (USD)</span>
          <span className="text-right">Size ({activeCoin.symbol})</span>
          <span className="text-right">Total</span>
        </div>

        {/* ASKS (Sellers) - Render inside out (higher prices at the top) */}
        <div id="asks-scroller" className="flex flex-col-reverse gap-[2px]">
          {asks.slice(0, 6).map((ask, idx) => (
            <div
              key={`ask-${idx}`}
              className="grid grid-cols-3 text-xs font-mono py-0.5 relative cursor-pointer hover:bg-zinc-800/20 transition-all"
              style={{
                background: `linear-gradient(270deg, rgba(239, 68, 68, 0.08) ${ask.cumulativePercent}%, transparent ${ask.cumulativePercent}%)`
              }}
            >
              <span className="text-rose-450 font-bold">${priceFormat(ask.price)}</span>
              <span className="text-right text-zinc-300">{sizeFormat(ask.size)}</span>
              <span className="text-right text-zinc-450">{sizeFormat(ask.total)}</span>
            </div>
          ))}
        </div>

        {/* CURRENT SPREAD SECTION */}
        <div id="mid-price-spread" className="bg-[#0a0a0b] py-2.5 px-2 rounded-lg border border-zinc-850 my-1 flex items-center justify-between">
          <div className="flex flex-col">
            <span className={`text-sm font-mono font-bold flex items-center gap-1 leading-tight ${changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${priceFormat(currentPrice)}
              {changePercent >= 0 ? <ArrowUpRight className="w-4 h-4 shrink-0 font-bold" /> : <ArrowDownRight className="w-4 h-4 shrink-0 font-bold" />}
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5 italic">
              Spread: ${priceFormat(spreadDetails.spread)} ({spreadDetails.spreadPercent.toFixed(3)}%)
            </span>
          </div>
        </div>

        {/* BIDS (Buyers) - Highest bidding prices at the top */}
        <div id="bids-scroller" className="flex flex-col gap-[2px]">
          {bids.slice(0, 6).map((bid, idx) => (
            <div
              key={`bid-${idx}`}
              className="grid grid-cols-3 text-xs font-mono py-0.5 relative cursor-pointer hover:bg-zinc-800/20 transition-all"
              style={{
                background: `linear-gradient(270deg, rgba(16, 185, 129, 0.06) ${bid.cumulativePercent}%, transparent ${bid.cumulativePercent}%)`
              }}
            >
              <span className="text-emerald-400 font-bold">${priceFormat(bid.price)}</span>
              <span className="text-right text-zinc-350">{sizeFormat(bid.size)}</span>
              <span className="text-right text-zinc-450">{sizeFormat(bid.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RECENT STREAMED TRADES */}
      <div id="recent-trades-scroller-box" className="mt-2 border-t border-zinc-850 pt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] uppercase font-mono font-bold text-zinc-500">
          <span>Recent Market Trades</span>
          <span>Time</span>
        </div>
        <div id="recent-market-trades-list" className="flex flex-col gap-1.5 h-[135px] overflow-y-auto scrollbar-none">
          {recentTrades.slice(0, 6).map((trade) => {
            const timeFormatted = new Date(trade.time).toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div key={trade.id} className="grid grid-cols-3 text-xs font-mono py-0.5 border-b border-zinc-900/10 last:border-0 hover:bg-zinc-800/20">
                <span className={trade.side === 'buy' ? 'text-emerald-400 font-medium' : 'text-rose-450 font-medium'}>
                  ${priceFormat(trade.price)}
                </span>
                <span className="text-right text-zinc-300">
                  {sizeFormat(trade.size)}
                </span>
                <span className="text-right text-zinc-500 text-[10px]">
                  {timeFormatted}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
