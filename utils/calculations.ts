
import { CandleData, IndicatorData, SupportResistance, Alert, AlertType, TargetLevels, MarketCycle } from '../types';
import { EMA_PERIODS, SR_LOOKBACK_PERIOD, PULLBACK_CANDLE_LOOKBACK, STRONG_CANDLE_BODY_LOOKBACK, VOLUME_AVERAGE_PERIOD } from '../constants';

export function calculateEMA(data: CandleData[], period: number): (number | null)[] {
  if (data.length < period) {
    return data.map(() => null);
  }
  const emaValues: (number | null)[] = new Array(data.length).fill(null);
  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  emaValues[period - 1] = sum / period;
  for (let i = period; i < data.length; i++) {
    const previousEMA = emaValues[i - 1];
    if (previousEMA !== null) {
      emaValues[i] = (data[i].close - previousEMA) * multiplier + previousEMA;
    }
  }
  return emaValues.map(val => val !== null ? parseFloat(val.toFixed(2)) : null);
}

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

function getCandleBodySize(candle: CandleData): number {
  return Math.abs(candle.close - candle.open);
}

function getAverageBodySize(candles: CandleData[], lookback: number): number {
  if (candles.length < lookback) return 0;
  const relevantCandles = candles.slice(-lookback);
  const totalBodySize = relevantCandles.reduce((sum, c) => sum + getCandleBodySize(c), 0);
  return totalBodySize / relevantCandles.length;
}

function getAverageVolume(candles: CandleData[], lookback: number): number {
  if (candles.length < lookback) return 0;
  const relevantCandles = candles.slice(-lookback);
  const totalVolume = relevantCandles.reduce((sum, c) => sum + c.volume, 0);
  return totalVolume / relevantCandles.length;
}

export function isStrongGreenCandle(currentCandle: CandleData, previousCandles: CandleData[], lookback: number): boolean {
  if (previousCandles.length < lookback) return false;
  if (currentCandle.close <= currentCandle.open) return false;
  const currentBodySize = getCandleBodySize(currentCandle);
  const avgPrevBodySize = getAverageBodySize(previousCandles, lookback);
  return currentBodySize > avgPrevBodySize * 1.5;
}

export function isStrongRedCandle(currentCandle: CandleData, previousCandles: CandleData[], lookback: number): boolean {
  if (previousCandles.length < lookback) return false;
  if (currentCandle.close >= currentCandle.open) return false;
  const currentBodySize = getCandleBodySize(currentCandle);
  const avgPrevBodySize = getAverageBodySize(previousCandles, lookback);
  return currentBodySize > avgPrevBodySize * 1.5;
}

function hasBullishPullback(currentCandle: CandleData, previousCandles: CandleData[], currentIndicators: IndicatorData, prevIndicators: IndicatorData): boolean {
  if (previousCandles.length < PULLBACK_CANDLE_LOOKBACK) return false;
  const prevCandle = previousCandles[previousCandles.length - 1];
  const { ema10, ema20 } = currentIndicators;
  const { ema10: prevEma10, ema20: prevEma20 } = prevIndicators;
  if (ema10 === null || ema20 === null || prevEma10 === null || prevEma20 === null) return false;
  const didTouchEma10 = (prevCandle.low <= ema10 && prevCandle.high >= ema10) || (prevCandle.low <= prevEma10 && prevCandle.high >= prevEma10);
  const didTouchEma20 = (prevCandle.low <= ema20 && prevCandle.high >= ema20) || (prevCandle.low <= prevEma20 && prevCandle.high >= prevEma20);
  const pullbackOccurred = (didTouchEma10 || didTouchEma20);
  const bounced = currentCandle.close > prevCandle.close;
  return pullbackOccurred && bounced;
}

function hasBearishPullback(currentCandle: CandleData, previousCandles: CandleData[], currentIndicators: IndicatorData, prevIndicators: IndicatorData): boolean {
  if (previousCandles.length < PULLBACK_CANDLE_LOOKBACK) return false;
  const prevCandle = previousCandles[previousCandles.length - 1];
  const { ema10, ema20 } = currentIndicators;
  const { ema10: prevEma10, ema20: prevEma20 } = prevIndicators;
  if (ema10 === null || ema20 === null || prevEma10 === null || prevEma20 === null) return false;
  const didTouchEma10 = (prevCandle.high >= ema10 && prevCandle.low <= ema10) || (prevCandle.high >= prevEma10 && prevCandle.low <= prevEma10);
  const didTouchEma20 = (prevCandle.high >= ema20 && prevCandle.low <= ema20) || (prevCandle.high >= prevEma20 && prevCandle.low <= prevEma20);
  const pullbackOccurred = (didTouchEma10 || didTouchEma20);
  const brokenDown = currentCandle.close < prevCandle.close;
  return pullbackOccurred && brokenDown;
}

export function checkForBuyCallAlert(asset: string, currentCandle: CandleData, previousCandles: CandleData[], currentIndicators: IndicatorData, prevIndicators: IndicatorData | null): Alert | null {
  const { ema10, ema20, ema50 } = currentIndicators;
  if (!ema10 || !ema20 || !ema50 || previousCandles.length < STRONG_CANDLE_BODY_LOOKBACK + PULLBACK_CANDLE_LOOKBACK + VOLUME_AVERAGE_PERIOD || !prevIndicators) return null;
  const ema10AboveEma20 = ema10 > ema20;
  const ema20AboveEma50 = ema20 > ema50;
  const priceAboveEma50 = currentCandle.close > ema50;
  const pullback = hasBullishPullback(currentCandle, previousCandles, currentIndicators, prevIndicators);
  const strongGreenCandle = isStrongGreenCandle(currentCandle, previousCandles, STRONG_CANDLE_BODY_LOOKBACK);
  const prevCandle = previousCandles[previousCandles.length - 1];
  const closeAbovePrevHigh = currentCandle.close > prevCandle.high;
  const avgVolume = getAverageVolume(previousCandles, VOLUME_AVERAGE_PERIOD);
  const highVolume = currentCandle.volume > avgVolume * 1.2;
  if (ema10AboveEma20 && ema20AboveEma50 && priceAboveEma50 && pullback && strongGreenCandle && closeAbovePrevHigh && highVolume) {
    return { id: `buy-call-${asset}-${currentCandle.timestamp}`, type: AlertType.BUY_CALL, message: '📈 Entrada CALL detectada – tendência confirmada', timestamp: currentCandle.timestamp, asset };
  }
  return null;
}

export function checkForSellPutAlert(asset: string, currentCandle: CandleData, previousCandles: CandleData[], currentIndicators: IndicatorData, prevIndicators: IndicatorData | null): Alert | null {
  const { ema10, ema20, ema50 } = currentIndicators;
  if (!ema10 || !ema20 || !ema50 || previousCandles.length < STRONG_CANDLE_BODY_LOOKBACK + PULLBACK_CANDLE_LOOKBACK + VOLUME_AVERAGE_PERIOD || !prevIndicators) return null;
  const ema10BelowEma20 = ema10 < ema20;
  const ema20BelowEma50 = ema20 < ema50;
  const priceBelowEma50 = currentCandle.close < ema50;
  const pullback = hasBearishPullback(currentCandle, previousCandles, currentIndicators, prevIndicators);
  const strongRedCandle = isStrongRedCandle(currentCandle, previousCandles, STRONG_CANDLE_BODY_LOOKBACK);
  const prevCandle = previousCandles[previousCandles.length - 1];
  const closeBelowPrevLow = currentCandle.close < prevCandle.low;
  const avgVolume = getAverageVolume(previousCandles, VOLUME_AVERAGE_PERIOD);
  const highVolume = currentCandle.volume > avgVolume * 1.2;
  if (ema10BelowEma20 && ema20BelowEma50 && priceBelowEma50 && pullback && strongRedCandle && closeBelowPrevLow && highVolume) {
    return { id: `sell-put-${asset}-${currentCandle.timestamp}`, type: AlertType.SELL_PUT, message: '📉 Entrada PUT detectada – tendência confirmada', timestamp: currentCandle.timestamp, asset };
  }
  return null;
}

export function checkForEarlyPullbackAlert(asset: string, currentCandle: CandleData, previousCandles: CandleData[], currentIndicators: IndicatorData): Alert | null {
  const { ema20 } = currentIndicators;
  if (!ema20 || previousCandles.length < 1) return null;
  const prevCandle = previousCandles[previousCandles.length - 1];
  const threshold = 0.0005;
  const candleTouchesEma20 = (currentCandle.low <= ema20 + (ema20 * threshold) && currentCandle.high >= ema20 - (ema20 * threshold));
  if (!candleTouchesEma20) return null;
  const isBullishPullback = currentCandle.close > ema20 && currentCandle.close > prevCandle.close;
  const isBearishPullback = currentCandle.close < ema20 && currentCandle.close < prevCandle.close;
  if (isBullishPullback) {
    return { id: `early-pullback-ema20-bullish-${asset}-${currentCandle.timestamp}`, type: AlertType.EARLY_PULLBACK_EMA20_BULLISH, message: '🟢 Pullback BULLISH na EMA 20: Potencial de alta!', timestamp: currentCandle.timestamp, asset };
  } else if (isBearishPullback) {
    return { id: `early-pullback-ema20-bearish-${asset}-${currentCandle.timestamp}`, type: AlertType.EARLY_PULLBACK_EMA20_BEARISH, message: '🔴 Pullback BEARISH na EMA 20: Potencial de baixa!', timestamp: currentCandle.timestamp, asset };
  }
  return null;
}

export function calculatePivotPoints(latestCandle: CandleData): TargetLevels {
  const pivot = (latestCandle.high + latestCandle.low + latestCandle.close) / 3;
  const r1 = (2 * pivot) - latestCandle.low;
  const s1 = (2 * pivot) - latestCandle.high;
  return {
    pivot: parseFloat(pivot.toFixed(2)),
    r1: parseFloat(r1.toFixed(2)),
    s1: parseFloat(s1.toFixed(2))
  };
}

export function checkForTargetLineConfirmationAlert(asset: string, currentCandle: CandleData, previousCandles: CandleData[], targetLineValue: number | null): Alert | null {
  if (targetLineValue === null || previousCandles.length < STRONG_CANDLE_BODY_LOOKBACK) return null;
  const prevCandle = previousCandles[previousCandles.length - 1];
  const breakRegion = { target: targetLineValue, low: Math.min(currentCandle.close, targetLineValue), high: Math.max(currentCandle.close, targetLineValue) };
  if (currentCandle.close > targetLineValue && prevCandle.close < targetLineValue && isStrongGreenCandle(currentCandle, previousCandles, STRONG_CANDLE_BODY_LOOKBACK)) {
    return { id: `target-confirm-bullish-${asset}-${currentCandle.timestamp}`, type: AlertType.TARGET_LINE_CONFIRMATION_BULLISH, message: `🎯 Confirmação BULLISH no Alvo: Preço rompeu acima da linha alvo!`, timestamp: currentCandle.timestamp, asset, breakPriceRegion: breakRegion };
  }
  if (currentCandle.close < targetLineValue && prevCandle.close > targetLineValue && isStrongRedCandle(currentCandle, previousCandles, STRONG_CANDLE_BODY_LOOKBACK)) {
    return { id: `target-confirm-bearish-${asset}-${currentCandle.timestamp}`, type: AlertType.TARGET_LINE_CONFIRMATION_BEARISH, message: `🎯 Confirmação BEARISH no Alvo: Preço rompeu abaixo da linha alvo!`, timestamp: currentCandle.timestamp, asset, breakPriceRegion: breakRegion };
  }
  return null;
}

export function checkForFollowThroughAlert(asset: string, currentCandle: CandleData, previousCandles: CandleData[], confirmedDirection: 'bullish' | 'bearish' | null): Alert | null {
  if (!confirmedDirection || previousCandles.length < STRONG_CANDLE_BODY_LOOKBACK) return null;
  const prevCandle = previousCandles[previousCandles.length - 1];
  if (confirmedDirection === 'bullish' && currentCandle.close > prevCandle.high && isStrongGreenCandle(currentCandle, previousCandles, STRONG_CANDLE_BODY_LOOKBACK)) {
    return { id: `follow-bull-${asset}-${currentCandle.timestamp}`, type: AlertType.TARGET_FOLLOW_THROUGH_BULLISH, message: `🚀 Seguindo Alvo BULLISH: Movimento de alta contínuo!`, timestamp: currentCandle.timestamp, asset };
  }
  if (confirmedDirection === 'bearish' && currentCandle.close < prevCandle.low && isStrongRedCandle(currentCandle, previousCandles, STRONG_CANDLE_BODY_LOOKBACK)) {
    return { id: `follow-bear-${asset}-${currentCandle.timestamp}`, type: AlertType.TARGET_FOLLOW_THROUGH_BEARISH, message: `☄️ Seguindo Alvo BEARISH: Movimento de baixa contínuo!`, timestamp: currentCandle.timestamp, asset };
  }
  return null;
}

export function determineMarketCycle(currentCandle: CandleData, currentIndicators: IndicatorData, previousCandles: CandleData[], previousIndicators: IndicatorData | null): MarketCycle | null {
  const { ema10, ema20, ema50 } = currentIndicators;
  if (!ema10 || !ema20 || !ema50 || previousCandles.length < 1 || !previousIndicators) {
    return null; // Not enough data
  }

  const prevEma10 = previousIndicators.ema10;
  const prevEma20 = previousIndicators.ema20;
  const prevEma50 = previousIndicators.ema50;

  if (prevEma10 === null || prevEma20 === null || prevEma50 === null) {
    return null;
  }

  const isEma10Rising = ema10 > prevEma10;
  const isEma20Rising = ema20 > prevEma20;
  const isEma50Rising = ema50 > prevEma50;

  const isEma10Falling = ema10 < prevEma10;
  const isEma20Falling = ema20 < prevEma20;
  const isEma50Falling = ema50 < prevEma50;

  // Strong Bullish Trend: EMAs are stacked up and all rising
  if (ema10 > ema20 && ema20 > ema50 && isEma10Rising && isEma20Rising && isEma50Rising) {
    return MarketCycle.BULLISH;
  }
  // Strong Bearish Trend: EMAs are stacked down and all falling
  if (ema10 < ema20 && ema20 < ema50 && isEma10Falling && isEma20Falling && isEma50Falling) {
    return MarketCycle.BEARISH;
  }

  // Early Bullish: EMA10 crosses EMA20 upwards
  if (ema10 > ema20 && prevEma10 <= prevEma20) {
    return MarketCycle.EARLY_BULLISH;
  }
  // Early Bearish: EMA10 crosses EMA20 downwards
  if (ema10 < ema20 && prevEma10 >= prevEma20) {
    return MarketCycle.EARLY_BEARISH;
  }

  // Neutral/Consolidation: EMAs are intertwined or flat
  return MarketCycle.NEUTRAL;
}

export function calculateAllIndicators(candles: CandleData[]): { indicators: IndicatorData[]; supportResistance: SupportResistance; } {
  const ema10Values = calculateEMA(candles, EMA_PERIODS.FAST);
  const ema20Values = calculateEMA(candles, EMA_PERIODS.MEDIUM);
  const ema50Values = calculateEMA(candles, EMA_PERIODS.SLOW);
  const indicators: IndicatorData[] = candles.map((_, index) => ({ ema10: ema10Values[index], ema20: ema20Values[index], ema50: ema50Values[index] }));
  const supportResistance = calculateSupportResistance(candles, SR_LOOKBACK_PERIOD);
  return { indicators, supportResistance };
}
