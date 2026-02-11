

import { AlertType } from './types';

export const EMA_PERIODS = {
  FAST: 10,
  MEDIUM: 20,
  SLOW: 50,
};

export const SR_LOOKBACK_PERIOD = 20;
export const PULLBACK_CANDLE_LOOKBACK = 2; // How many candles back to check for pullback touch
export const STRONG_CANDLE_BODY_LOOKBACK = 3; // Number of previous candles to compare body size against
export const VOLUME_AVERAGE_PERIOD = 10; // Number of previous candles for average volume calculation

// Updated mock assets to focus on Forex and Crypto
export const MOCK_ASSETS: string[] = ['BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD'];
export const CHART_DATA_LIMIT = 100; // Max number of candles to show on the chart

export const TIMEFRAME_OPTIONS = {
  '1m': 60 * 1000,
  '3m': 3 * 60 * 1000,
  '5m': 5 * 60 * 1000,
};

export const ALERT_MESSAGES: Record<AlertType, string> = {
  [AlertType.BUY_CALL]: '📈 Entrada CALL detectada – tendência confirmada',
  [AlertType.SELL_PUT]: '📉 Entrada PUT detectada – tendência confirmada',
  [AlertType.EARLY_PULLBACK_EMA20]: '⚠️ Alerta de Pullback Antecipado na EMA 20',
};

// Audio assets for alerts
export const ALERT_SOUND_PATH = '/alert.mp3'; // You would need to provide an actual audio file
