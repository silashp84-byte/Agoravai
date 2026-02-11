
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
  EARLY_PULLBACK_EMA20 = 'EARLY_PULLBACK_EMA20', // Generic, might be phased out or used as fallback
  EARLY_PULLBACK_EMA20_BULLISH = 'EARLY_PULLBACK_EMA20_BULLISH',
  EARLY_PULLBACK_EMA20_BEARISH = 'EARLY_PULLBACK_EMA20_BEARISH',
  TARGET_LINE_CONFIRMATION_BULLISH = 'TARGET_LINE_CONFIRMATION_BULLISH',
  TARGET_LINE_CONFIRMATION_BEARISH = 'TARGET_LINE_CONFIRMATION_BEARISH',
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: number;
  asset: string; // Added for more specific alerts
}

export interface AssetMonitorState {
  candleData: CandleData[];
  indicatorData: IndicatorData[];
  supportResistance: SupportResistance;
}