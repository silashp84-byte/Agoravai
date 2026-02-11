

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
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: number;
  asset: string; // Added for more specific alerts
}