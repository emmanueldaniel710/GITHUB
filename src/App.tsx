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
import { InteractiveTutorial } from './components/InteractiveTutorial';
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
    if (saved === '10000' || saved === '10000.00') {
      return 200.00;
    }
    return saved ? parseFloat(saved) : 200.00;
  });

  // Onboarding Academy Interactive Tour State
  const [tutorialStep, setTutorialStep] = useState<number>(() => {
    const completed = localStorage.getItem('tutorial_completed');
    return completed === 'true' ? -1 : 0; // auto-start on first loading session, otherwise manual
  });

  // Ads & Practice Funding configuration
  const [showAdModal, setShowAdModal] = useState<boolean>(false);
  const [adCountdown, setAdCountdown] = useState<number>(5);
  const [adClaimable, setAdClaimable] = useState<boolean>(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAdPlay = () => {
    setShowAdModal(true);
    setAdCountdown(5);
    setAdClaimable(false);
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    countdownIntervalRef.current = setInterval(() => {
      setAdCountdown(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          setAdClaimable(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClaimAdReward = () => {
    setWalletBalance(prev => prev + 100.00);
    setShowAdModal(false);
    triggerAlert('Ad complete! Successfully credited +$100.00 practice balance to your wallet.', 'success');
  };

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

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
    if (confirm('Are you sure you want to reset your practice account? All active positions and logs will be archived.')) {
      setWalletBalance(200.00);
      setPositions([]);
      setLimitOrders([]);
      setTradeLogs([]);
      triggerAlert('Practice terminal restored to fallback parameters ($200.00 USD)', 'success');
    }
  };

  const handleCompleteTutorial = () => {
    setWalletBalance(prev => prev + 100.00);
    setTutorialStep(-1);
    localStorage.setItem('tutorial_completed', 'true');
    triggerAlert('🎓 Academy complete! Successfully credited +$100.00 practice balance to your wallet.', 'success');
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
        onTriggerAdEarn={startAdPlay}
        onTriggerTutorial={() => setTutorialStep(0)}
      />

      {/* Primary Workspace Layout */}
      {activeCoin ? (
        <main id="main-terminal-body" className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col lg:flex-row gap-5">
          
          {/* LEFT SUBGRID COLUMN (Large Canvas Charts & Positions) */}
          <div id="terminal-left-column" className="flex-1 flex flex-col gap-5 min-w-0 w-full">
            {/* Custom SVG Candlestick Widget */}
            <div id="wrapper-chart-glow" className={`transition-all duration-300 rounded-xl ${tutorialStep === 1 ? 'ring-4 ring-indigo-500 animate-pulse border-indigo-400 z-120 relative' : ''}`}>
              <ChartSection
                candles={candles}
                activeCoin={activeCoin}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />
            </div>

            {/* Positions detail and ledger tables */}
            <div id="wrapper-positions-glow" className={`transition-all duration-300 rounded-xl ${tutorialStep === 5 ? 'ring-4 ring-indigo-500 animate-pulse border-indigo-400 z-120 relative' : ''}`}>
              <PositionsTable
                positions={positions}
                limitOrders={limitOrders}
                tradeLogs={tradeLogs}
                onClosePosition={handleClosePosition}
                onCancelOrder={handleCancelOrder}
              />
            </div>
          </div>

          {/* RIGHT SIDEBAR DRAWER (Order input form, Depth order book, AI analysis reports) */}
          <div id="terminal-right-column" className="w-full lg:w-[325px] shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-5">
            {/* Margin Order execution form */}
            <div id="wrapper-trading-glow" className={`w-full transition-all duration-300 rounded-xl ${tutorialStep === 3 || tutorialStep === 4 ? 'ring-4 ring-indigo-500 animate-pulse border-indigo-400 z-120 relative' : ''}`}>
              <TradingPanel
                activeCoin={activeCoin}
                walletBalance={walletBalance}
                onOpenPosition={handleOpenPosition}
              />
            </div>

            {/* Live Order Book depth maps sidebar */}
            <div id="wrapper-orderbook-glow" className={`w-full transition-all duration-300 rounded-xl ${tutorialStep === 2 ? 'ring-4 ring-indigo-500 animate-pulse border-indigo-400 z-120 relative' : ''}`}>
              <OrderBook
                bids={bids}
                asks={asks}
                activeCoin={activeCoin}
                recentTrades={recentTrades}
              />
            </div>

            {/* Gemini Technical Advisory strategist card */}
            <div className="w-full md:col-span-2 lg:col-span-1">
              <AIAnalyst
                activeCoin={activeCoin}
                candles={candles}
                timeframe={timeframe}
              />
            </div>
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

      {/* Simulated Premium Ad Player Modal */}
      {showAdModal && (
        <div id="ad-sponsor-modal" className="fixed inset-0 bg-[#020204]/90 z-100 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in animate-duration-200">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 text-center relative overflow-hidden">
            
            {/* Header / Timer info bar */}
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
                <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-bold">SPONSOR INTERACTIVE FEED</span>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#0a0a0b] text-zinc-400 border border-zinc-850">
                {adCountdown > 0 ? `Claimable in ${adCountdown}s` : 'Ad Complete! 🎉'}
              </span>
            </div>

            {/* Simulated Live Google Ad Frame with AdSense publisher values */}
            <div className="bg-[#0a0a0b] border border-zinc-850 rounded-xl p-6 min-h-[220px] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-2 right-3 text-[8px] font-mono font-bold tracking-widest text-zinc-650 uppercase">
                Ad Network Slot • ca-pub-5861536854329756
              </div>

              {/* Dynamic decorative banner graphics representing trading software sponsors */}
              <div className="flex-1 flex flex-col items-center justify-center gap-2.5 py-4">
                <div className="w-12 h-12 bg-indigo-600/10 rounded-xl border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-lg font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 font-sans tracking-tight">LuminaEX Technical Alpha Package</h3>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-[340px] mx-auto leading-relaxed">
                    Auto-reconciliation signals, instant leveraged compounding overlays, and priority real-time node pathways.
                  </p>
                </div>
                {/* Real hidden element containing the requested pagead2 script to guarantee native delivery of asset requests */}
                <ins className="adsbygoogle"
                     style={{ display: 'block', width: '0px', height: '0px', opacity: 0 }}
                     data-ad-client="ca-pub-5861536854329756"
                     data-ad-slot="practice-wallet-topup"
                     data-ad-format="auto"
                     data-full-width-responsive="true"></ins>
              </div>

              {/* Simulated Loading/Playing State line indicator */}
              <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-1000 ease-linear" 
                  style={{ width: `${((5 - adCountdown) / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowAdModal(false)}
                className="flex-1 py-2 px-4 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-semibold hover:bg-zinc-900 hover:text-zinc-200 transition cursor-pointer"
              >
                Skip ad
              </button>
              
              <button
                type="button"
                disabled={!adClaimable}
                onClick={handleClaimAdReward}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                  adClaimable
                    ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 font-extrabold scale-[1.02]'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                }`}
              >
                Claim $100.00 cash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive step-by-step onboarding tutorial overlay */}
      <InteractiveTutorial
        currentStep={tutorialStep}
        onStepChange={setTutorialStep}
        onComplete={handleCompleteTutorial}
        onSkip={() => setTutorialStep(-1)}
        walletBalance={walletBalance}
      />
    </div>
  );
}
