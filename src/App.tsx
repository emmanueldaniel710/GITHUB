/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { ChartSection } from './components/ChartSection';
import { TradingPanel } from './components/TradingPanel';
import { OrderBook } from './components/OrderBook';
import { PositionsTable } from './components/PositionsTable';
import { AIAnalyst } from './components/AIAnalyst';
import { Coin, Candle, Position, PositionType, LimitOrder, TradeLog, OrderBookEntry, Timeframe } from './types';
import { generateHistory, addTick, generateOrderBook, STANDARD_COINS } from './utils/marketSim';
import { AlertCircle, CheckCircle2, TrendingUp, HelpCircle, RefreshCcw } from 'lucide-react';

export default function App() {
  // --- STATE DECLARATIONS ---
  const [coins, setCoins] = useState<Coin[]>([]);
  const [activeCoin, setActiveCoin] = useState<Coin | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  
  // Order Depth books & stream trades state
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [recentTrades, setRecentTrades] = useState<{ id: string; price: number; size: number; side: 'buy' | 'sell'; time: number }[]>([]);

  // Persistent User Holdings & Ledger state
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem('sim_wallet_balance');
    return saved ? parseFloat(saved) : 10000.00;
  });

  const [positions, setPositions] = useState<Position[]>(() => {
    const saved = localStorage.getItem('sim_positions');
    return saved ? JSON.parse(saved) : [];
  });

  const [limitOrders, setLimitOrders] = useState<LimitOrder[]>(() => {
    const saved = localStorage.getItem('sim_limit_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>(() => {
    const saved = localStorage.getItem('sim_trade_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Floating notifications banner messages
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);

  // Keep a reference to the active coin state for our background interval tick calculations
  const activeCoinRef = useRef<Coin | null>(null);
  activeCoinRef.current = activeCoin;

  const candlesRef = useRef<Candle[]>([]);
  candlesRef.current = candles;

  const timeframeRef = useRef<Timeframe>(timeframe);
  timeframeRef.current = timeframe;

  // --- PERSISTENCE SYNCHRONIZER EFFECTS ---
  useEffect(() => {
    localStorage.setItem('sim_wallet_balance', walletBalance.toString());
  }, [walletBalance]);

  useEffect(() => {
    localStorage.setItem('sim_positions', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('sim_limit_orders', JSON.stringify(limitOrders));
  }, [limitOrders]);

  useEffect(() => {
    localStorage.setItem('sim_trade_logs', JSON.stringify(tradeLogs));
  }, [tradeLogs]);

  // Alert dismiss helper timer
  const triggerAlert = (text: string, type: 'success' | 'danger' | 'info') => {
    setAlertMessage({ text, type });
    const t = setTimeout(() => setAlertMessage(null), 5000);
    return () => clearTimeout(t);
  };

  // --- INITIAL MARKET RETRIEVER MOUNT ---
  useEffect(() => {
    async function loadCoins() {
      try {
        const res = await fetch('/api/market/coins');
        const data = await res.json();
        
        let loadedCoins: Coin[] = [];
        if (data && data.data && data.data.length > 0) {
          loadedCoins = data.data;
        } else {
          // Fallback to standard backup list if API fails
          loadedCoins = STANDARD_COINS as Coin[];
        }

        setCoins(loadedCoins);
        
        // Default to Bitcoin on load
        const btc = loadedCoins.find(c => c.symbol === 'BTC') || loadedCoins[0];
        setActiveCoin(btc);
      } catch (err) {
        console.error('Core market retriever failed:', err);
        const fallback = STANDARD_COINS as Coin[];
        setCoins(fallback);
        setActiveCoin(fallback[0]);
      }
    }
    loadCoins();
  }, []);

  // --- CHART BUILDER TRIGGERS (Switching Coins/Timeframe) ---
  useEffect(() => {
    if (!activeCoin) return;
    const currentPrice = parseFloat(activeCoin.priceUsd) || 100.0;
    
    // Generate initial historical candles
    const history = generateHistory(currentPrice, activeCoin.symbol, timeframe, 120);
    setCandles(history);

    // Build matching Order Book
    const { bids: bkBids, asks: bkAsks } = generateOrderBook(currentPrice, activeCoin.symbol);
    setBids(bkBids);
    setAsks(bkAsks);

    // Create 10 starting recent trade prints
    const startTrades = Array.from({ length: 12 }, (_, i) => {
      const scaleMultiplier = 0.0008;
      const tPrice = currentPrice * (1 + (Math.random() - 0.5) * scaleMultiplier);
      const isBuy = Math.random() > 0.45;
      return {
        id: `start-t-${i}`,
        price: parseFloat(tPrice.toFixed(4)),
        size: Math.random() * (currentPrice < 1 ? 500 : 1.5) + (currentPrice < 1 ? 50 : 0.05),
        side: isBuy ? 'buy' : ('sell' as 'buy' | 'sell'),
        time: Date.now() - (i * 2500),
      };
    });
    setRecentTrades(startTrades);
  }, [activeCoin, timeframe]);

  // --- POSITION/ORDER MATCHING TICK ENGINE ---
  useEffect(() => {
    const TICK_INTERVAL_MS = 1500;

    const timer = setInterval(() => {
      const active = activeCoinRef.current;
      if (!active) return;

      const currSpotPrice = parseFloat(active.priceUsd) || 0;

      // 1. Advance the Chart candlestick array with a live micro-walk
      const { updatedCandles, nextPrice } = addTick(candlesRef.current, currSpotPrice, active.symbol, timeframeRef.current);
      setCandles(updatedCandles);

      // Adjust the active spot price in memory
      const updatedCoinObj = { ...active, priceUsd: nextPrice.toString() };
      setActiveCoin(updatedCoinObj);

      // Update spot on master coins array too to keep sidebar pricing interactive
      setCoins(prevCoins => prevCoins.map(c => c.id === active.id ? updatedCoinObj : c));

      // 2. Refresh matching Orderbook Depth maps
      const { bids: nextBids, asks: nextAsks } = generateOrderBook(nextPrice, active.symbol);
      setBids(nextBids);
      setAsks(nextAsks);

      // Add a live trade print
      if (Math.random() > 0.3) {
        setRecentTrades(prev => [
          {
            id: `trade-${Date.now()}-${Math.random()}`,
            price: nextPrice,
            size: Math.random() * (nextPrice < 1 ? 800 : 2) + 0.01,
            side: Math.random() > 0.48 ? 'buy' : 'sell',
            time: Date.now(),
          },
          ...prev.slice(0, 30) // cap size
        ]);
      }

      // 3. Process Active Positions (PNLs, Protections & Forced Liquidations)
      setPositions(prevPositions => {
        let needsStateUpdate = false;
        const mapped = prevPositions.map(pos => {
          // Only evaluate positions belonging to current active coin under fluctuation
          if (pos.coinId !== active.id) return pos;

          needsStateUpdate = true;
          const updatedPos = { ...pos, currentPrice: nextPrice };

          const posPnl = updatedPos.type === 'long'
            ? (nextPrice - updatedPos.entryPrice) * updatedPos.size
            : (updatedPos.entryPrice - nextPrice) * updatedPos.size;

          // Check for FLUID LIQUIDATION trigger!
          // Liquidate if asset price crosses liquidation boundary
          const isLiquidated = updatedPos.type === 'long'
            ? nextPrice <= updatedPos.liquidationPrice
            : nextPrice >= updatedPos.liquidationPrice;

          if (isLiquidated) {
            // Instant Forced Liquidation logic
            triggerAlert(`FORCED LIQUIDATION! ${updatedPos.coinSymbol} ${updatedPos.type} closed at $${nextPrice} (Collateral wiped)`, 'danger');
            
            // Log trade as complete -100% loss
            const log: TradeLog = {
              id: `liq-${Date.now()}`,
              coinSymbol: updatedPos.coinSymbol,
              type: updatedPos.type,
              leverage: updatedPos.leverage,
              margin: updatedPos.margin,
              entryPrice: updatedPos.entryPrice,
              closePrice: nextPrice,
              pnl: -updatedPos.margin, // complete collateral wiped
              timestamp: Date.now()
            };
            setTradeLogs(prev => [log, ...prev]);
            return null; // remove from list
          }

          // Check for custom SL / TP Protections if designated
          if (updatedPos.takeProfit) {
            const tpTriggered = updatedPos.type === 'long'
              ? nextPrice >= updatedPos.takeProfit
              : nextPrice <= updatedPos.takeProfit;

            if (tpTriggered) {
              triggerAlert(`TAKE PROFIT TRIGGERED! ${updatedPos.coinSymbol} closed at $${nextPrice}`, 'success');
              setWalletBalance(prev => prev + updatedPos.margin + posPnl);
              
              const log: TradeLog = {
                id: `tp-${Date.now()}`,
                coinSymbol: updatedPos.coinSymbol,
                type: updatedPos.type,
                leverage: updatedPos.leverage,
                margin: updatedPos.margin,
                entryPrice: updatedPos.entryPrice,
                closePrice: nextPrice,
                pnl: posPnl,
                timestamp: Date.now()
              };
              setTradeLogs(prev => [log, ...prev]);
              return null;
            }
          }

          if (updatedPos.stopLoss) {
            const slTriggered = updatedPos.type === 'long'
              ? nextPrice <= updatedPos.stopLoss
              : nextPrice >= updatedPos.stopLoss;

            if (slTriggered) {
              triggerAlert(`STOP LOSS TRIGGERED! ${updatedPos.coinSymbol} closed at $${nextPrice}`, 'danger');
              setWalletBalance(prev => prev + updatedPos.margin + posPnl);

              const log: TradeLog = {
                id: `sl-${Date.now()}`,
                coinSymbol: updatedPos.coinSymbol,
                type: updatedPos.type,
                leverage: updatedPos.leverage,
                margin: updatedPos.margin,
                entryPrice: updatedPos.entryPrice,
                closePrice: nextPrice,
                pnl: posPnl,
                timestamp: Date.now()
              };
              setTradeLogs(prev => [log, ...prev]);
              return null;
            }
          }

          return updatedPos;
        });

        // Filter out null rows representing closed or wiped positions
        return mapped.filter(Boolean) as Position[];
      });

      // 4. Process Pending Limit Orders
      setLimitOrders(prevOrders => {
        const triggered: LimitOrder[] = [];
        const remaining = prevOrders.filter(ord => {
          if (ord.coinId !== active.id) return true;
          
          const crossed = ord.type === 'long'
            ? nextPrice <= ord.limitPrice // Buy if price drops to or lower than limit
            : nextPrice >= ord.limitPrice; // Sell if price rises to or higher than limit

          if (crossed) {
            triggered.push(ord);
            return false; // remove from pending
          }
          return true;
        });

        if (triggered.length > 0) {
          triggered.forEach(ord => {
            // Open Position immediately
            const mmr = ord.leverage <= 5 ? 0.05 : ord.leverage <= 20 ? 0.025 : ord.leverage <= 50 ? 0.01 : 0.005;
            const liqPrice = ord.type === 'long'
              ? ord.limitPrice * (1 - (1 / ord.leverage) + mmr)
              : ord.limitPrice * (1 + (1 / ord.leverage) - mmr);

            const size = (ord.margin * ord.leverage) / ord.limitPrice;

            const position: Position = {
              id: `pos-${Date.now()}-${Math.random()}`,
              coinId: ord.coinId,
              coinSymbol: ord.coinSymbol,
              type: ord.type,
              leverage: ord.leverage,
              entryPrice: ord.limitPrice,
              currentPrice: nextPrice,
              size,
              margin: ord.margin,
              liquidationPrice: liqPrice,
              takeProfit: null,
              stopLoss: null,
              timestamp: Date.now()
            };

            setPositions(prev => [position, ...prev]);
            triggerAlert(`LIMIT ORDER MATCHED! Registered ${ord.type} position for ${ord.coinSymbol}/USD at $${ord.limitPrice}`, 'success');
          });
        }

        return remaining;
      });

    }, TICK_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  // --- POSITION & MARGIN CONTROLLER HANDLERS ---
  const handleOpenPosition = ({
    type,
    margin,
    leverage,
    limitPrice,
    stopLoss,
    takeProfit,
  }: {
    type: PositionType;
    margin: number;
    leverage: number;
    limitPrice: number | null;
    stopLoss: number | null;
    takeProfit: number | null;
  }) => {
    if (!activeCoin) return;

    if (margin > walletBalance) {
      triggerAlert('Insufficient available capital margin', 'danger');
      return;
    }

    const currentSpot = parseFloat(activeCoin.priceUsd) || 0;
    const executionPrice = limitPrice || currentSpot;
    const positionValue = margin * leverage;
    const tokenSize = positionValue / executionPrice;

    // Deduct entry margin immediately from user wallet
    setWalletBalance(prev => prev - margin);

    // If it's a Limit Order, add to Limit Order list instead of active positions
    if (limitPrice) {
      const order: LimitOrder = {
        id: `ord-${Date.now()}`,
        coinId: activeCoin.id,
        coinSymbol: activeCoin.symbol,
        type,
        limitPrice,
        margin,
        leverage,
        size: tokenSize,
        timestamp: Date.now()
      };
      setLimitOrders(prev => [order, ...prev]);
      triggerAlert(`Limit trade logged: Entry pending at $${limitPrice} for ${activeCoin.symbol}`, 'info');
      return;
    }

    // Direct Market order execution
    const mmr = leverage <= 5 ? 0.05 : leverage <= 20 ? 0.025 : leverage <= 50 ? 0.01 : 0.005;
    const lP = type === 'long'
      ? executionPrice * (1 - (1 / leverage) + mmr)
      : executionPrice * (1 + (1 / leverage) - mmr);

    const pos: Position = {
      id: `pos-${Date.now()}`,
      coinId: activeCoin.id,
      coinSymbol: activeCoin.symbol,
      type,
      leverage,
      entryPrice: executionPrice,
      currentPrice: currentSpot,
      size: tokenSize,
      margin,
      liquidationPrice: lP,
      takeProfit,
      stopLoss,
      timestamp: Date.now()
    };

    setPositions(prev => [pos, ...prev]);
    triggerAlert(`Successful execution! Leveraged ${type} opened for ${activeCoin.symbol} (${leverage}x)`, 'success');
  };

  const handleClosePosition = (id: string) => {
    const target = positions.find(p => p.id === id);
    if (!target) return;

    // Return margin back plus or minus net PNL
    const pnl = target.type === 'long'
      ? (target.currentPrice - target.entryPrice) * target.size
      : (target.entryPrice - target.currentPrice) * target.size;

    const payoutCapital = target.margin + pnl;
    
    // Safely credit the user's balance
    setWalletBalance(prev => Math.max(prev + payoutCapital, 0));

    // Remove from positions
    setPositions(prev => prev.filter(p => p.id !== id));

    // Append to Historic Ledgers
    const log: TradeLog = {
      id: `trade-${Date.now()}`,
      coinSymbol: target.coinSymbol,
      type: target.type,
      leverage: target.leverage,
      margin: target.margin,
      entryPrice: target.entryPrice,
      closePrice: target.currentPrice,
      pnl,
      timestamp: Date.now(),
    };

    setTradeLogs(prev => [log, ...prev]);
    triggerAlert(`Closed position! Payout settled. Net PNL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, pnl >= 0 ? 'success' : 'danger');
  };

  const handleCancelOrder = (id: string) => {
    const target = limitOrders.find(o => o.id === id);
    if (!target) return;

    // Refund collateral margin instantly
    setWalletBalance(prev => prev + target.margin);
    setLimitOrders(prev => prev.filter(o => o.id !== id));
    triggerAlert(`Cancelled limit order. Collateral refunded.`, 'info');
  };

  const handleResetAccount = () => {
    if (confirm('Are you sure you want to reset your trading sandbox? All active positions and logs will be archived.')) {
      setWalletBalance(10000.00);
      setPositions([]);
      setLimitOrders([]);
      setTradeLogs([]);
      triggerAlert('Trading simulator restored to stock parameters ($10,000 USD)', 'success');
    }
  };

  // --- STATISTICAL MEMO CALCULATORS ---
  const openPositionsPnl = useMemo(() => {
    return positions.reduce((acc, pos) => {
      const p = pos.type === 'long'
        ? (pos.currentPrice - pos.entryPrice) * pos.size
        : (pos.entryPrice - pos.currentPrice) * pos.size;
      return acc + p;
    }, 0);
  }, [positions]);

  const totalMaintenanceMargin = useMemo(() => {
    return positions.reduce((acc, pos) => {
      // MMR (e.g. 5%) of positions nominal volume acts as maintenance threshold
      const posVal = pos.margin * pos.leverage;
      const mmr = pos.leverage <= 5 ? 0.05 : pos.leverage <= 20 ? 0.025 : pos.leverage <= 50 ? 0.01 : 0.005;
      return acc + (posVal * mmr);
    }, 0);
  }, [positions]);

  return (
    <div id="app-root-container" className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex flex-col font-sans select-none antialiased">
      {/* Floating alert banners panel */}
      {alertMessage && (
        <div
          id="floating-alerts-layer"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-55 max-w-md w-11/12 animate-bounce"
        >
          <div className={`p-4 rounded-xl border shadow-xl flex items-start gap-3 text-sm font-sans ${
            alertMessage.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-300'
              : alertMessage.type === 'danger'
              ? 'bg-[#121214]/95 border-rose-500/50 text-rose-350'
              : 'bg-[#121214]/95 border-zinc-800 text-indigo-300'
          }`}>
            {alertMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{alertMessage.type === 'success' ? 'Settlement Notification' : alertMessage.type === 'danger' ? 'Margin Warning' : 'Simulation Update'}</p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-snug">{alertMessage.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main header stats widget */}
      <Header
        coins={coins}
        activeCoin={activeCoin}
        onSelectCoin={setActiveCoin}
        walletBalance={walletBalance}
        openPositionsPnl={openPositionsPnl}
        totalMaintenanceMargin={totalMaintenanceMargin}
        onResetAccount={handleResetAccount}
        selectedTimeframe={timeframe}
        onSelectTimeframe={setTimeframe}
      />

      {/* Primary Workspace Layout */}
      {activeCoin ? (
        <main id="main-terminal-body" className="flex-1 w-full max-w-[1440px] mx-auto px-6 py-5 flex flex-col lg:flex-row gap-5">
          
          {/* LEFT SUBGRID COLUMN (Large Canvas Charts & Positions) */}
          <div id="terminal-left-column" className="flex-1 flex flex-col gap-5 min-w-0">
            {/* Custom SVG Candlestick Widget */}
            <ChartSection
              candles={candles}
              activeCoin={activeCoin}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />

            {/* Positions detail and ledger tables */}
            <PositionsTable
              positions={positions}
              limitOrders={limitOrders}
              tradeLogs={tradeLogs}
              onClosePosition={handleClosePosition}
              onCancelOrder={handleCancelOrder}
            />
          </div>

          {/* RIGHT SIDEBAR DRAWER (Order input form, Depth order book, AI analysis reports) */}
          <div id="terminal-right-column" className="w-full lg:w-[325px] shrink-0 flex flex-col md:flex-row lg:flex-col gap-5">
            {/* Margin Order execution form */}
            <TradingPanel
              activeCoin={activeCoin}
              walletBalance={walletBalance}
              onOpenPosition={handleOpenPosition}
            />

            {/* Live Order Book depth maps sidebar */}
            <OrderBook
              bids={bids}
              asks={asks}
              activeCoin={activeCoin}
              recentTrades={recentTrades}
            />

            {/* Gemini Technical Advisory strategist card */}
            <AIAnalyst
              activeCoin={activeCoin}
              candles={candles}
              timeframe={timeframe}
            />
          </div>
        </main>
      ) : (
        <div id="terminal-boot-screen" className="flex-1 flex flex-col items-center justify-center py-24 select-none">
          <div className="relative flex items-center justify-center">
            <RefreshCcw className="w-10 h-10 text-indigo-400 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-zinc-350 mt-5">
            Waking up high-fidelity market data feeds...
          </p>
          <p className="text-xs text-zinc-550 mt-1 italic font-mono uppercase tracking-wider text-[10px]">
            Negotiating CoinCap SSL payloads
          </p>
        </div>
      )}
    </div>
  );
}
