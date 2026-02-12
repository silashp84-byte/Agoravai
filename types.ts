
export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  ema10: number | null;
  ema20: number | null;
  ema50: number | null;
}

export interface SupportResistance {
  support: number | null;
  resistance: number | null;
}

export enum AlertType {
  BUY_CALL = 'BUY_CALL',
  SELL_PUT = 'SELL_PUT',
  EARLY_PULLBACK_EMA20 = 'EARLY_PULLBACK_EMA20',
  EARLY_PULLBACK_EMA20_BULLISH = 'EARLY_PULLBACK_EMA20_BULLISH',
  EARLY_PULLBACK_EMA20_BEARISH = 'EARLY_PULLBACK_EMA20_BEARISH',
  TARGET_LINE_CONFIRMATION_BULLISH = 'TARGET_LINE_CONFIRMATION_BULLISH',
  TARGET_LINE_CONFIRMATION_BEARISH = 'TARGET_LINE_CONFIRMATION_BEARISH',
  TARGET_FOLLOW_THROUGH_BULLISH = 'TARGET_FOLLOW_THROUGH_BULLISH',
  TARGET_FOLLOW_THROUGH_BEARISH = 'TARGET_FOLLOW_THROUGH_BEARISH',
}

export enum MarketCycle {
  BULLISH = 'BULLISH',
  BEARISH = 'BEARISH',
  NEUTRAL = 'NEUTRAL',
  EARLY_BULLISH = 'EARLY_BULLISH',
  EARLY_BEARISH = 'EARLY_BEARISH',
}

export interface TargetLevels {
  pivot: number | null;
  r1: number | null;
  s1: number | null;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: number;
  asset: string;
  breakPriceRegion?: { low: number, high: number, target: number } | null;
}

export interface AssetMonitorState {
  candleData: CandleData[];
  indicatorData: IndicatorData[];
  supportResistance: SupportResistance;
  marketCycle: MarketCycle | null; // NEW: Market cycle for the asset
}
