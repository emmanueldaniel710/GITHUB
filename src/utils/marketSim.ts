/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Candle, Coin, OrderBookEntry } from '../types';

// Standard coins metadata for reference and backup
export const STANDARD_COINS: Partial<Coin>[] = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', priceUsd: '64200.00', changePercent24Hr: '1.45', marketCapUsd: '1260000000000', volumeUsd24Hr: '28000000000' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', priceUsd: '3150.00', changePercent24Hr: '-0.85', marketCapUsd: '378000000000', volumeUsd24Hr: '15000000000' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', priceUsd: '143.50', changePercent24Hr: '5.20', marketCapUsd: '65000000000', volumeUsd24Hr: '3200000000' },
  { id: 'binance-coin', name: 'BNB', symbol: 'BNB', priceUsd: '565.00', changePercent24Hr: '0.12', marketCapUsd: '83000000000', volumeUsd24Hr: '1200000000' },
  { id: 'ripple', name: 'XRP', symbol: 'XRP', priceUsd: '0.52', changePercent24Hr: '-1.30', marketCapUsd: '29000000000', volumeUsd24Hr: '950000000' },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', priceUsd: '0.45', changePercent24Hr: '2.15', marketCapUsd: '16000000000', volumeUsd24Hr: '380000000' },
];

/**
 * Gets volatility and drift coefficients based on coin symbol
 */
function getCoinVol(symbol: string) {
  switch (symbol.toUpperCase()) {
    case 'BTC':
      return { volatility: 0.0015, drift: 0.00002 };
    case 'ETH':
      return { volatility: 0.0022, drift: 0.00003 };
    case 'SOL':
      return { volatility: 0.0045, drift: 0.00006 };
    case 'BNB':
      return { volatility: 0.0020, drift: 0.00002 };
    case 'ADA':
    case 'XRP':
      return { volatility: 0.0035, drift: -0.00001 };
    default:
      return { volatility: 0.0030, drift: 0.00002 };
  }
}

/**
 * Returns candle duration in milliseconds based on timeframe string
 */
export function getTimeframeMs(timeframe: string): number {
  switch (timeframe) {
    case '1m': return 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '1H': return 60 * 60 * 1000;
    case '4H': return 4 * 60 * 60 * 1000;
    case '1D': return 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

/**
 * Generates initial realistic historical candles for a coin price using a random walk
 */
export function generateHistory(currentPrice: number, symbol: string, timeframe: string, count = 120): Candle[] {
  const candles: Candle[] = [];
  const durationMs = getTimeframeMs(timeframe);
  const now = Date.now();
  const { volatility, drift } = getCoinVol(symbol);

  let tempPrice = currentPrice / (1 + drift * count); // Start approximately lower/higher based on drift
  
  // Create historical database moving backward in time
  for (let i = count; i >= 1; i--) {
    const time = now - i * durationMs;
    
    // Simulate multiple tick subdivisions inside each candle to make high/low look realistic
    let candleOpen = tempPrice;
    let high = tempPrice;
    let low = tempPrice;
    let lastClose = tempPrice;
    
    // Divide candle into 5 steps to establish realistic body & wicks
    for (let s = 0; s < 5; s++) {
      const stepChange = (Math.random() - 0.5 + drift) * volatility;
      lastClose = lastClose * (1 + stepChange);
      if (lastClose > high) high = lastClose;
      if (lastClose < low) low = lastClose;
    }
    
    const candleClose = lastClose;
    tempPrice = candleClose; // Next candle starts where this ends
    
    const volume = Math.floor((10000 + Math.random() * 50000) * (currentPrice < 1 ? 5000 : 100 / currentPrice));

    candles.push({
      time,
      open: parseFloat(candleOpen.toFixed(4)),
      high: parseFloat(high.toFixed(4)),
      low: parseFloat(low.toFixed(4)),
      close: parseFloat(candleClose.toFixed(4)),
      volume,
    });
  }

  // Ensure the very last candle's close value aligns roughly with the active live current price
  if (candles.length > 0) {
    candles[candles.length - 1].close = currentPrice;
  }

  return candles;
}

/**
 * Generates a new live tick update.
 * Modifies the last candles array directly or appends a new candle if timeframe has elapsed.
 */
export function addTick(candles: Candle[], currentPrice: number, symbol: string, timeframe: string): { updatedCandles: Candle[]; nextPrice: number } {
  if (candles.length === 0) {
    const fresh = generateHistory(currentPrice, symbol, timeframe, 100);
    return { updatedCandles: fresh, nextPrice: currentPrice };
  }

  const durationMs = getTimeframeMs(timeframe);
  const now = Date.now();
  const lastCandle = candles[candles.length - 1];
  const { volatility, drift } = getCoinVol(symbol);

  // High resolution tick fluctuation
  const change = (Math.random() - 0.5 + drift) * (volatility * 0.4); // smaller slice for single tick
  const nextPriceObj = currentPrice * (1 + change);
  const nextPrice = parseFloat(nextPriceObj.toFixed(4));

  const isNewCandleNeeded = now - lastCandle.time >= durationMs;

  let result: Candle[] = [...candles];

  if (isNewCandleNeeded) {
    // Commit old candle completely and create a new candle
    const nextCandleTime = lastCandle.time + durationMs;
    const newCandle: Candle = {
      time: nextCandleTime,
      open: lastCandle.close,
      high: Math.max(lastCandle.close, nextPrice),
      low: Math.min(lastCandle.close, nextPrice),
      close: nextPrice,
      volume: Math.floor(Math.random() * 200 + 50),
    };
    result.push(newCandle);
    if (result.length > 200) {
      result.shift(); // Bound size
    }
  } else {
    // Modify current active candle
    const updated = { ...lastCandle };
    updated.close = nextPrice;
    if (nextPrice > updated.high) updated.high = nextPrice;
    if (nextPrice < updated.low) updated.low = nextPrice;
    updated.volume += Math.floor(Math.random() * 20);
    result[result.length - 1] = updated;
  }

  return { updatedCandles: result, nextPrice };
}

/**
 * Simulates real-looking Order Book entries corresponding to a specific spot price
 */
export function generateOrderBook(spotPrice: number, symbol: string): { bids: OrderBookEntry[]; asks: OrderBookEntry[] } {
  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];

  const { volatility } = getCoinVol(symbol);
  const spreadPercent = 0.0003 + Math.random() * 0.0004; // Very tight professional spread spreads
  const halfSpread = spotPrice * (spreadPercent / 2);

  let bidTotal = 0;
  let askTotal = 0;
  
  // Generate 8 bid levels matching technical depth
  for (let i = 1; i <= 8; i++) {
    // Price sinks lower as level climbs for bids
    const priceDecrease = halfSpread + (i - 1) * (spotPrice * volatility * 0.3) * (0.8 + Math.random() * 0.4);
    const bidPrice = parseFloat((spotPrice - priceDecrease).toFixed(4));
    
    // Size distribution resembles order depth curves
    const size = (30 / (i + 0.4)) * (0.6 + Math.random() * 0.8) * (spotPrice < 1 ? 2000 : 100 / spotPrice);
    bidTotal += size;

    bids.push({
      price: bidPrice,
      size,
      total: bidTotal,
      cumulativePercent: 0, // Calculated below
    });
  }

  // Generate 8 ask levels matching technical depth
  for (let i = 1; i <= 8; i++) {
    // Price climbs higher as level climbs for asks
    const priceIncrease = halfSpread + (i - 1) * (spotPrice * volatility * 0.3) * (0.8 + Math.random() * 0.4);
    const askPrice = parseFloat((spotPrice + priceIncrease).toFixed(4));
    
    const size = (30 / (i + 0.4)) * (0.6 + Math.random() * 0.8) * (spotPrice < 1 ? 2000 : 100 / spotPrice);
    askTotal += size;

    asks.push({
      price: askPrice,
      size,
      total: askTotal,
      cumulativePercent: 0,
    });
  }

  // Set depth bars proportions
  const maxBidTotal = bids[bids.length - 1].total;
  const maxAskTotal = asks[asks.length - 1].total;
  const maxTotalVal = Math.max(maxBidTotal, maxAskTotal);

  bids.forEach(b => b.cumulativePercent = (b.total / maxTotalVal) * 100);
  asks.forEach(a => a.cumulativePercent = (a.total / maxTotalVal) * 100);

  return { bids, asks };
}

/**
 * Generates technical indicator readings mock calculation to send to AI / display
 */
export function calculateTechnicalIndicators(candles: Candle[]) {
  if (candles.length < 25) {
    return {
      rsi: 50,
      macd: { line: 0, signal: 0, histogram: 0 },
      ema9: candles[candles.length - 1]?.close || 0,
      ema21: candles[candles.length - 1]?.close || 0,
    };
  }

  const closes = candles.map(c => c.close);
  const lastPrice = closes[closes.length - 1];

  // Simple EMA approximation for EMA 9 and 21
  let ema9 = closes[0];
  let ema21 = closes[0];
  const k9 = 2 / (9 + 1);
  const k21 = 2 / (21 + 1);

  for (let i = 1; i < closes.length; i++) {
    ema9 = closes[i] * k9 + ema9 * (1 - k9);
    ema21 = closes[i] * k21 + ema21 * (1 - k21);
  }

  // Relative Strength Index (RSI) relative standard calculation over preceding 14 candles
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }
  
  const rs = losses === 0 ? 100 : gains / losses;
  const rsi = parseFloat((100 - (100 / (1 + rs))).toFixed(1));

  // MACD approximation (EMA12 - EMA26)
  let ema12 = closes[0];
  let ema26 = closes[0];
  const k12 = 2 / (12 + 1);
  const k26 = 2 / (26 + 1);

  for (let i = 1; i < closes.length; i++) {
    ema12 = closes[i] * k12 + ema12 * (1 - k12);
    ema26 = closes[i] * k26 + ema26 * (1 - k26);
  }

  const macdLine = ema12 - ema26;
  const macdSignal = macdLine * 0.2; // Simpler smoothing
  const macdHist = macdLine - macdSignal;

  return {
    rsi,
    macd: {
      line: parseFloat(macdLine.toFixed(4)),
      signal: parseFloat(macdSignal.toFixed(4)),
      histogram: parseFloat(macdHist.toFixed(4)),
    },
    ema9: parseFloat(ema9.toFixed(4)),
    ema21: parseFloat(ema21.toFixed(4)),
  };
}
