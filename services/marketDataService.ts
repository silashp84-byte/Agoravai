import { CandleData } from '../types';

const INITIAL_PRICE_RANGE = { min: 100, max: 200 };
const PRICE_VOLATILITY = 0.01; // 1% price fluctuation

function getRandomPrice(basePrice: number): number {
  return basePrice * (1 + (Math.random() - 0.5) * PRICE_VOLATILITY * 2);
}

export function generateMockCandle(previousClose: number, timestamp: number): CandleData {
  const open = previousClose;
  const high = getRandomPrice(open * 1.005); // Slightly higher than open
  const low = getRandomPrice(open * 0.995);  // Slightly lower than open
  const close = getRandomPrice(open);      // Final close price

  const finalHigh = Math.max(open, high, low, close);
  const finalLow = Math.min(open, high, low, close);

  // Calculate volume based on candle range (high - low) for more dynamic numbers
  const candleRange = finalHigh - finalLow;
  const baseVolume = Math.floor(Math.random() * 500) + 100; // Base random volume
  const rangeVolume = Math.floor(candleRange * 500); // Scale range to influence volume
  const volume = baseVolume + rangeVolume;

  return {
    timestamp,
    open: parseFloat(open.toFixed(2)),
    high: parseFloat(finalHigh.toFixed(2)),
    low: parseFloat(finalLow.toFixed(2)),
    close: parseFloat(close.toFixed(2)),
    volume: volume,
  };
}

export function getInitialCandleData(asset: string, count: number, timeframeMs: number): CandleData[] {
  const data: CandleData[] = [];
  let currentPrice = (INITIAL_PRICE_RANGE.min + INITIAL_PRICE_RANGE.max) / 2 + Math.random() * (INITIAL_PRICE_RANGE.max - INITIAL_PRICE_RANGE.min) / 2;
  // Go back in time for initial data based on timeframe
  let currentTimestamp = Date.now() - count * timeframeMs; 

  for (let i = 0; i < count; i++) {
    const candle = generateMockCandle(currentPrice, currentTimestamp);
    data.push(candle);
    currentPrice = candle.close;
    currentTimestamp += timeframeMs; // Increment by selected timeframe
  }
  return data;
}

interface SubscriptionHandle {
  intervalId: number;
}

export function subscribeToMarketData(
  asset: string,
  initialData: CandleData[],
  onNewCandle: (candle: CandleData) => void,
  timeframeMs: number, // Use timeframeMs for generation interval
): SubscriptionHandle {
  let latestClose = initialData.length > 0 ? initialData[initialData.length - 1].close : (INITIAL_PRICE_RANGE.min + INITIAL_PRICE_RANGE.max) / 2;
  let latestTimestamp = initialData.length > 0 ? initialData[initialData.length - 1].timestamp : Date.now();

  const intervalId = window.setInterval(() => {
    latestTimestamp += timeframeMs; // Increment by selected timeframe
    const newCandle = generateMockCandle(latestClose, latestTimestamp);
    latestClose = newCandle.close;
    onNewCandle(newCandle);
  }, timeframeMs); // Generate new candle at timeframe interval

  return { intervalId };
}

export function unsubscribeFromMarketData(handle: SubscriptionHandle): void {
  window.clearInterval(handle.intervalId);
}