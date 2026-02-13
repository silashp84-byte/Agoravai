
import { AlertType, MarketCycle } from './types';

export const EMA_PERIODS = {
  FAST: 10,
  MEDIUM: 20,
  SLOW: 50,
};

export const SR_LOOKBACK_PERIOD = 20;
export const PULLBACK_CANDLE_LOOKBACK = 2; 
export const STRONG_CANDLE_BODY_LOOKBACK = 3; 
export const VOLUME_AVERAGE_PERIOD = 10; 

export const MOCK_ASSETS: string[] = ['BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'ETCUSDT'];
export const CHART_DATA_LIMIT = 100; 

export const TIMEFRAME_OPTIONS = {
  '1m': 60 * 1000,
  '90s': 90 * 1000, 
  '3m': 3 * 60 * 1000,
  '5m': 5 * 60 * 1000,
};

export const ALERT_MESSAGES: Record<AlertType, string> = {
  [AlertType.BUY_CALL]: '📈 Entrada CALL detectada – tendência confirmada',
  [AlertType.SELL_PUT]: '📉 Entrada PUT detectada – tendência confirmada',
  [AlertType.EARLY_PULLBACK_EMA20]: '⚠️ Alerta de Pullback Antecipado na EMA 20',
  [AlertType.EARLY_PULLBACK_EMA20_BULLISH]: '🟢 Pullback BULLISH na EMA 20: Potencial de alta!',
  [AlertType.EARLY_PULLBACK_EMA20_BEARISH]: '🔴 Pullback BEARISH na EMA 20: Potencial de baixa!',
  [AlertType.TARGET_LINE_CONFIRMATION_BULLISH]: '🎯 Confirmação BULLISH no Alvo: Preço rompeu acima da linha alvo!',
  [AlertType.TARGET_LINE_CONFIRMATION_BEARISH]: '🎯 Confirmação BEARISH no Alvo: Preço rompeu abaixo da linha alvo!',
  [AlertType.TARGET_FOLLOW_THROUGH_BULLISH]: '🚀 Seguindo Alvo BULLISH: Movimento de alta contínuo!',
  [AlertType.TARGET_FOLLOW_THROUGH_BEARISH]: '☄️ Seguindo Alvo BEARISH: Movimento de baixa contínuo!',
};

export const MARKET_CYCLE_MESSAGES: Record<MarketCycle, string> = {
  [MarketCycle.BULLISH]: 'Bullish',
  [MarketCycle.BEARISH]: 'Bearish',
  [MarketCycle.NEUTRAL]: 'Neutral',
  [MarketCycle.EARLY_BULLISH]: 'Early Bullish',
  [MarketCycle.EARLY_BEARISH]: 'Early Bearish',
};

export const MARKET_CYCLE_COLORS: Record<MarketCycle, string> = {
  [MarketCycle.BULLISH]: 'bg-emerald-600',
  [MarketCycle.BEARISH]: 'bg-pink-600',
  [MarketCycle.NEUTRAL]: 'bg-gray-500',
  [MarketCycle.EARLY_BULLISH]: 'bg-lime-500',
  [MarketCycle.EARLY_BEARISH]: 'bg-orange-500',
};

export const ALERT_SOUND_PATH = '/alert.mp3'; 
export const ALERT_DURATION_MS = 2 * 1000;