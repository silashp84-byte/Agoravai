
import { CandleData, IndicatorData, SupportResistance, Alert, AlertType } from '../types';
import { EMA_PERIODS, SR_LOOKBACK_PERIOD, PULLBACK_CANDLE_LOOKBACK, STRONG_CANDLE_BODY_LOOKBACK, VOLUME_AVERAGE_PERIOD } from '../constants';

/**
 * Calculates the Exponential Moving Average (EMA) for a given data set and period.
 * @param data Array of CandleData.
 * @param period The EMA period.
 * @returns Array of EMA values, or null if not enough data.
 */
export function calculateEMA(data: CandleData[], period: number): (number | null)[] {
  if (data.length < period) {
    return data.map(() => null);
  }

  const emaValues: (number | null)[] = new Array(data.length).fill(null);
  const multiplier = 2 / (period + 1);

  // Calculate initial SMA for the first 'period' candles
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  emaValues[period - 1] = sum / period;

  // Calculate subsequent EMAs
  for (let i = period; i < data.length; i++) {
    const previousEMA = emaValues[i - 1];
    if (previousEMA !== null) {
      emaValues[i] = (data[i].close - previousEMA) * multiplier + previousEMA;
    }
  }

  return emaValues.map(val => val !== null ? parseFloat(val.toFixed(2)) : null);
}

/**
 * Calculates automatic Support and Resistance levels based on the last N candles.
 * Simple approach: highest high for resistance, lowest low for support.
 * @param data Array of CandleData.
 * @param lookback The number of recent candles to consider.
 * @returns SupportResistance object.
 */
export function calculateSupportResistance(data: CandleData[], lookback: number): SupportResistance {
  if (data.length === 0) {
    return { support: null, resistance: null };
  }

  const relevantData = data.slice(-lookback);
  let support: number | null = null;
  let resistance: number | null = null;

  if (relevantData.length > 0) {
    support = Math.min(...relevantData.map(c => c.low));
    resistance = Math.max(...relevantData.map(c => c.high));
  }

  return {
    support: support !== null ? parseFloat(support.toFixed(2)) : null,
    resistance: resistance !== null ? parseFloat(resistance.toFixed(2)) : null,
  };
}

/**
 * Helper to calculate candle body size (absolute difference between open and close)
 */
function getCandleBodySize(candle: CandleData): number {
  return Math.abs(candle.close - candle.open);
}

/**
 * Helper to get average body size over a lookback period
 */
function getAverageBodySize(candles: CandleData[], lookback: number): number {
  if (candles.length < lookback) return 0;
  const relevantCandles = candles.slice(-lookback);
  const totalBodySize = relevantCandles.reduce((sum, c) => sum + getCandleBodySize(c), 0);
  return totalBodySize / relevantCandles.length;
}

/**
 * Helper to get average volume over a lookback period
 */
function getAverageVolume(candles: CandleData[], lookback: number): number {
  if (candles.length < lookback) return 0;
  const relevantCandles = candles.slice(-lookback);
  const totalVolume = relevantCandles.reduce((sum, c) => sum + c.volume, 0);
  return totalVolume / relevantCandles.length;
}

/**
 * Checks if the current candle is green and its body is significantly larger than previous candles.
 */
function isStrongGreenCandle(currentCandle: CandleData, previousCandles: CandleData[], lookback: number): boolean {
  if (previousCandles.length < lookback) return false;
  // Current candle must be green
  if (currentCandle.close <= currentCandle.open) return false;

  const currentBodySize = getCandleBodySize(currentCandle);
  const avgPrevBodySize = getAverageBodySize(previousCandles, lookback);

  // Strong candle means its body is significantly larger (e.g., 1.5x)
  return currentBodySize > avgPrevBodySize * 1.5;
}

/**
 * Checks if the current candle is red and its body is significantly larger than previous candles.
 */
function isStrongRedCandle(currentCandle: CandleData, previousCandles: CandleData[], lookback: number): boolean {
  if (previousCandles.length < lookback) return false;
  // Current candle must be red
  if (currentCandle.close >= currentCandle.open) return false;

  const currentBodySize = getCandleBodySize(currentCandle);
  const avgPrevBodySize = getAverageBodySize(previousCandles, lookback);

  // Strong candle means its body is significantly larger (e.g., 1.5x)
  return currentBodySize > avgPrevBodySize * 1.5;
}

/**
 * Checks for a bullish pullback where price touches EMA10/20 and bounces.
 */
function hasBullishPullback(currentCandle: CandleData, previousCandles: CandleData[], currentIndicators: IndicatorData, prevIndicators: IndicatorData): boolean {
  if (previousCandles.length < PULLBACK_CANDLE_LOOKBACK) return false;

  const prevCandle = previousCandles[previousCandles.length -1]; // Immediately previous candle
  const { ema10, ema20 } = currentIndicators;
  const { ema10: prevEma10, ema20: prevEma20 } = prevIndicators;

  if (ema10 === null || ema20 === null || prevEma10 === null || prevEma20 === null) return false;

  // Pullback condition: Previous candle's low touched EMA10 or EMA20
  // "Touching" means the low of the candle was at or below the EMA, and it might have bounced back.
  // We check if the previous candle's low was near or below EMA, and the current candle is closing higher.
  const didTouchEma10 = (prevCandle.low <= ema10 && prevCandle.high >= ema10) || (prevCandle.low <= prevEma10 && prevCandle.high >= prevEma10);
  const didTouchEma20 = (prevCandle.low <= ema20 && prevCandle.high >= ema20) || (prevCandle.low <= prevEma20 && prevCandle.high >= prevEma20);

  const pullbackOccurred = (didTouchEma10 || didTouchEma20);

  // Confirmation of bounce: current candle closed above previous candle's close
  const bounced = currentCandle.close > prevCandle.close;

  return pullbackOccurred && bounced;
}

/**
 * Checks for a bearish pullback where price touches EMA10/20 and bounces down.
 */
function hasBearishPullback(currentCandle: CandleData, previousCandles: CandleData[], currentIndicators: IndicatorData, prevIndicators: IndicatorData): boolean {
  if (previousCandles.length < PULLBACK_CANDLE_LOOKBACK) return false;

  const prevCandle = previousCandles[previousCandles.length -1]; // Immediately previous candle
  const { ema10, ema20 } = currentIndicators;
  const { ema10: prevEma10, ema20: prevEma20 } = prevIndicators;

  if (ema10 === null || ema20 === null || prevEma10 === null || prevEma20 === null) return false;

  // Pullback condition: Previous candle's high touched EMA10 or EMA20
  const didTouchEma10 = (prevCandle.high >= ema10 && prevCandle.low <= ema10) || (prevCandle.high >= prevEma10 && prevCandle.low <= prevEma10);
  const didTouchEma20 = (prevCandle.high >= ema20 && prevCandle.low <= ema20) || (prevCandle.high >= prevEma20 && prevCandle.low <= prevEma20);

  const pullbackOccurred = (didTouchEma10 || didTouchEma20);

  // Confirmation of breakdown: current candle closed below previous candle's close
  const brokenDown = currentCandle.close < prevCandle.close;

  return pullbackOccurred && brokenDown;
}

/**
 * Generates a BUY (CALL) alert if all conditions are met.
 */
export function checkForBuyCallAlert(
  asset: string,
  currentCandle: CandleData,
  previousCandles: CandleData[], // All previous candles for lookback calculations
  currentIndicators: IndicatorData,
  prevIndicators: IndicatorData | null,
): Alert | null {
  const { ema10, ema20, ema50 } = currentIndicators;

  // Ensure we have enough data and valid indicators
  if (!ema10 || !ema20 || !ema50 || previousCandles.length < STRONG_CANDLE_BODY_LOOKBACK + PULLBACK_CANDLE_LOOKBACK + VOLUME_AVERAGE_PERIOD || !prevIndicators) {
    return null;
  }

  // Conditions:
  // 1. EMA 10 > EMA 20
  const ema10AboveEma20 = ema10 > ema20;
  // 2. EMA 20 > EMA 50
  const ema20AboveEma50 = ema20 > ema50;
  // 3. Price (close) above EMA 50
  const priceAboveEma50 = currentCandle.close > ema50;
  // 4. Occurred a pullback touching EMA 10 or EMA 20, and bounced
  const pullback = hasBullishPullback(currentCandle, previousCandles, currentIndicators, prevIndicators);
  // 5. Strong green candle
  const strongGreenCandle = isStrongGreenCandle(currentCandle, previousCandles, STRONG_CANDLE_BODY_LOOKBACK);
  // 6. Current candle closes above the high of the immediately previous candle
  const prevCandle = previousCandles[previousCandles.length - 1];
  const closeAbovePrevHigh = currentCandle.close > prevCandle.high;
  // 7. Volume greater than average of last X candles (optional but recommended)
  const currentVolume = currentCandle.volume;
  const avgVolume = getAverageVolume(previousCandles, VOLUME_AVERAGE_PERIOD);
  const highVolume = currentVolume > avgVolume * 1.2; // 20% higher than average

  if (
    ema10AboveEma20 &&
    ema20AboveEma50 &&
    priceAboveEma50 &&
    pullback &&
    strongGreenCandle &&
    closeAbovePrevHigh &&
    highVolume // Consider making this optional in App.tsx if desired
  ) {
    return {
      id: `buy-call-${asset}-${currentCandle.timestamp}`,
      type: AlertType.BUY_CALL,
      message: '📈 Entrada CALL detectada – tendência confirmada',
      timestamp: currentCandle.timestamp,
      asset,
    };
  }

  return null;
}

/**
 * Generates a SELL (PUT) alert if all conditions are met.
 */
export function checkForSellPutAlert(
  asset: string,
  currentCandle: CandleData,
  previousCandles: CandleData[], // All previous candles for lookback calculations
  currentIndicators: IndicatorData,
  prevIndicators: IndicatorData | null,
): Alert | null {
  const { ema10, ema20, ema50 } = currentIndicators;

  // Ensure we have enough data and valid indicators
  if (!ema10 || !ema20 || !ema50 || previousCandles.length < STRONG_CANDLE_BODY_LOOKBACK + PULLBACK_CANDLE_LOOKBACK + VOLUME_AVERAGE_PERIOD || !prevIndicators) {
    return null;
  }

  // Conditions:
  // 1. EMA 10 < EMA 20
  const ema10BelowEma20 = ema10 < ema20;
  // 2. EMA 20 < EMA 50
  const ema20BelowEma50 = ema20 < ema50;
  // 3. Price (close) below EMA 50
  const priceBelowEma50 = currentCandle.close < ema50;
  // 4. Occurred a pullback touching EMA 10 or EMA 20, and broke down
  const pullback = hasBearishPullback(currentCandle, previousCandles, currentIndicators, prevIndicators);
  // 5. Strong red candle
  const strongRedCandle = isStrongRedCandle(currentCandle, previousCandles, STRONG_CANDLE_BODY_LOOKBACK);
  // 6. Current candle closes below the low of the immediately previous candle
  const prevCandle = previousCandles[previousCandles.length - 1];
  const closeBelowPrevLow = currentCandle.close < prevCandle.low;
  // 7. Volume greater than average of last X candles (optional but recommended)
  const currentVolume = currentCandle.volume;
  // Fix: Changed 'VOLUME_AVERAGE_AVERAGE_PERIOD' to 'VOLUME_AVERAGE_PERIOD'
  const avgVolume = getAverageVolume(previousCandles, VOLUME_AVERAGE_PERIOD);
  const highVolume = currentVolume > avgVolume * 1.2; // 20% higher than average

  if (
    ema10BelowEma20 &&
    ema20BelowEma50 &&
    priceBelowEma50 &&
    pullback &&
    strongRedCandle &&
    closeBelowPrevLow &&
    highVolume // Consider making this optional in App.tsx if desired
  ) {
    return {
      id: `sell-put-${asset}-${currentCandle.timestamp}`,
      type: AlertType.SELL_PUT,
      message: '📉 Entrada PUT detectada – tendência confirmada',
      timestamp: currentCandle.timestamp,
      asset,
    };
  }

  return null;
}

/**
 * Generates an Early Pullback Alert if price touches EMA20, specifying direction.
 */
export function checkForEarlyPullbackAlert(
  asset: string,
  currentCandle: CandleData,
  previousCandles: CandleData[],
  currentIndicators: IndicatorData,
): Alert | null {
  const { ema20 } = currentIndicators;

  if (!ema20 || previousCandles.length < 1) return null; // Need at least one previous candle for context

  const prevCandle = previousCandles[previousCandles.length - 1];
  const threshold = 0.0005; // Small percentage for "touch" proximity

  // Check if current candle's range "touches" EMA20
  const candleTouchesEma20 =
    (currentCandle.low <= ema20 + (ema20 * threshold) && currentCandle.high >= ema20 - (ema20 * threshold));

  if (!candleTouchesEma20) return null;

  // Determine direction based on where the close is relative to the EMA20 and previous candle
  const isBullishPullback = currentCandle.close > ema20 && currentCandle.close > prevCandle.close;
  const isBearishPullback = currentCandle.close < ema20 && currentCandle.close < prevCandle.close;

  if (isBullishPullback) {
    return {
      id: `early-pullback-ema20-bullish-${asset}-${currentCandle.timestamp}`,
      type: AlertType.EARLY_PULLBACK_EMA20_BULLISH,
      message: '🟢 Pullback BULLISH na EMA 20: Potencial de alta!',
      timestamp: currentCandle.timestamp,
      asset,
    };
  } else if (isBearishPullback) {
    return {
      id: `early-pullback-ema20-bearish-${asset}-${currentCandle.timestamp}`,
      type: AlertType.EARLY_PULLBACK_EMA20_BEARISH,
      message: '🔴 Pullback BEARISH na EMA 20: Potencial de baixa!',
      timestamp: currentCandle.timestamp,
      asset,
    };
  }

  return null; // No clear directional pullback detected despite touching EMA20
}

/**
 * Generates an alert when price strongly breaks through the target line, confirming direction.
 */
export function checkForTargetLineConfirmationAlert(
  asset: string,
  currentCandle: CandleData,
  previousCandles: CandleData[],
  targetLineValue: number | null,
): Alert | null {
  // Need a valid target line and enough previous candles to determine "strong" movement
  if (targetLineValue === null || previousCandles.length < STRONG_CANDLE_BODY_LOOKBACK) {
    return null;
  }

  const prevCandle = previousCandles[previousCandles.length - 1];

  // Bullish Confirmation: Current candle closed above target, previous closed below, and it's a strong green candle
  if (
    currentCandle.close > targetLineValue &&
    prevCandle.close < targetLineValue &&
    isStrongGreenCandle(currentCandle, previousCandles, STRONG_CANDLE_BODY_LOOKBACK)
  ) {
    return {
      id: `target-confirm-bullish-${asset}-${currentCandle.timestamp}`,
      type: AlertType.TARGET_LINE_CONFIRMATION_BULLISH,
      message: `🎯 Confirmação BULLISH no Alvo: Preço rompeu acima da linha alvo!`,
      timestamp: currentCandle.timestamp,
      asset,
    };
  }

  // Bearish Confirmation: Current candle closed below target, previous closed above, and it's a strong red candle
  if (
    currentCandle.close < targetLineValue &&
    prevCandle.close > targetLineValue &&
    isStrongRedCandle(currentCandle, previousCandles, STRONG_CANDLE_BODY_LOOKBACK)
  ) {
    return {
      id: `target-confirm-bearish-${asset}-${currentCandle.timestamp}`,
      type: AlertType.TARGET_LINE_CONFIRMATION_BEARISH,
      message: `🎯 Confirmação BEARISH no Alvo: Preço rompeu abaixo da linha alvo!`,
      timestamp: currentCandle.timestamp,
      asset,
    };
  }

  return null;
}

/**
 * Calculates all required indicators (EMA, S/R) for a given set of candle data.
 * @param candles Array of CandleData.
 * @returns An object containing calculated indicators and S/R levels.
 */
export function calculateAllIndicators(candles: CandleData[]): {
  indicators: IndicatorData[];
  supportResistance: SupportResistance;
} {
  const ema10Values = calculateEMA(candles, EMA_PERIODS.FAST);
  const ema20Values = calculateEMA(candles, EMA_PERIODS.MEDIUM);
  const ema50Values = calculateEMA(candles, EMA_PERIODS.SLOW);

  const indicators: IndicatorData[] = candles.map((_, index) => ({
    ema10: ema10Values[index],
    ema20: ema20Values[index],
    ema50: ema50Values[index],
  }));

  const supportResistance = calculateSupportResistance(candles, SR_LOOKBACK_PERIOD);

  return { indicators, supportResistance };
}
