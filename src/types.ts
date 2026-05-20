/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Coin {
  id: string;
  rank: string;
  symbol: string;
  name: string;
  supply: string;
  maxSupply: string | null;
  marketCapUsd: string;
  volumeUsd24Hr: string;
  priceUsd: string;
  changePercent24Hr: string;
  vwap24Hr: string | null;
}

export interface Candle {
  time: number; // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PositionType = 'long' | 'short';

export interface Position {
  id: string;
  coinId: string;
  coinSymbol: string;
  type: PositionType;
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  size: number; // Token quantity
  margin: number; // USD collateral
  liquidationPrice: number;
  takeProfit: number | null;
  stopLoss: number | null;
  timestamp: number;
}

export interface LimitOrder {
  id: string;
  coinId: string;
  coinSymbol: string;
  type: PositionType;
  limitPrice: number;
  margin: number;
  leverage: number;
  size: number;
  timestamp: number;
}

export interface TradeLog {
  id: string;
  coinSymbol: string;
  type: PositionType;
  leverage: number;
  margin: number;
  entryPrice: number;
  closePrice: number;
  pnl: number;
  timestamp: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
  cumulativePercent: number; // For visualization depth
}

export interface MarketHistory {
  [coinId: string]: Candle[];
}

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

export interface AnalystReport {
  trend: 'bullish' | 'bearish' | 'neutral';
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0 to 100
  support: number[];
  resistance: number[];
  analysis: string; // Markdown summary
  indicatorSummary: {
    rsi: { value: number; interpretation: string };
    macd: { line: number; signal: number; interpretation: string };
    ema: { ema9: number; ema21: number; trend: string };
  };
}
