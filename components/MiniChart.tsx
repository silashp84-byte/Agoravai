
import React from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis, XAxis } from 'recharts';
import { CandleData, IndicatorData, Alert, AlertType, MarketCycle } from '../types';
import { MARKET_CYCLE_COLORS, MARKET_CYCLE_MESSAGES } from '../constants';

interface MiniChartProps {
  asset: string;
  candleData: CandleData[];
  indicatorData: IndicatorData[];
  isSelected: boolean;
  assetAlerts: Alert[]; // New prop for asset-specific alerts
  marketCycle: MarketCycle | null; // NEW: Market cycle prop
  onClick: (asset: string) => void;
}

const getAlertColor = (type: AlertType) => {
  switch (type) {
    case AlertType.BUY_CALL:
    case AlertType.EARLY_PULLBACK_EMA20_BULLISH:
      return '#34D399'; // Emerald-400
    case AlertType.SELL_PUT:
    case AlertType.EARLY_PULLBACK_EMA20_BEARISH:
      return '#F472B6'; // Pink-400
    case AlertType.EARLY_PULLBACK_EMA20: // Fallback for generic, if still used
      return '#FACC15'; // Yellow-300 (neon yellow)
    case AlertType.TARGET_LINE_CONFIRMATION_BULLISH:
    case AlertType.TARGET_LINE_CONFIRMATION_BEARISH:
      return '#E879F9'; // Fuchsia-400
    default:
      return '#A1A1AA'; // Gray-400
  }
};

const MiniChart: React.FC<MiniChartProps> = ({
  asset,
  candleData,
  indicatorData,
  isSelected,
  assetAlerts, // Destructure new prop
  marketCycle, // Destructure new prop
  onClick,
}) => {
  const chartData = candleData.map((candle, index) => ({
    ...candle,
    ...indicatorData[index],
  }));

  const latestPrice = candleData.length > 0 ? candleData[candleData.length - 1].close : 'N/A';
  const priceColor = candleData.length > 1 && candleData[candleData.length - 1].close > candleData[candleData.length - 2].close ? 'text-emerald-400' : 'text-pink-400';

  // Determine the color for the alert indicator based on the most recent alert type
  const mostRecentAlert = assetAlerts.reduce((latest, current) => 
    (!latest || current.timestamp > latest.timestamp) ? current : latest, null as Alert | null
  );
  const alertIndicatorColor = mostRecentAlert ? getAlertColor(mostRecentAlert.type) : undefined;


  return (
    <div
      className={`relative bg-green-900 rounded-xl shadow-md p-2 cursor-pointer transition-all duration-200 border-2 ${
        isSelected ? 'border-yellow-300 scale-105' : 'border-transparent hover:border-yellow-600'
      }`}
      onClick={() => onClick(asset)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`View detailed chart for ${asset}`}
    >
      {assetAlerts.length > 0 && alertIndicatorColor && (
        <span
          className="absolute top-2 right-2 h-3 w-3 rounded-full z-10"
          style={{ backgroundColor: alertIndicatorColor }}
          title={`Active alert: ${mostRecentAlert?.message || 'Unknown alert'}`}
          aria-label={`Alert active for ${asset}`}
        ></span>
      )}

      <div className="flex justify-between items-center mb-1">
        <h4 className="text-sm font-semibold text-lime-100">{asset}</h4>
        <span className={`text-sm font-bold ${priceColor}`}>{typeof latestPrice === 'number' ? latestPrice.toFixed(2) : latestPrice}</span>
      </div>
      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <XAxis hide dataKey="timestamp" />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#A7F3D0" // Aqua green for price
              strokeWidth={1}
              dot={false}
              isAnimationActive={false} // Disable animation for performance
            />
            {/* Display EMA 20 for a general trend indication */}
            <Line
              type="monotone"
              dataKey="ema20"
              stroke="#67E8F9" // Cyan for EMA 20
              strokeWidth={1}
              dot={false}
              isAnimationActive={false} // Disable animation for performance
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* NEW: Display Market Cycle */}
      {marketCycle && (
        <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-medium text-white ${MARKET_CYCLE_COLORS[marketCycle]}`}>
          {MARKET_CYCLE_MESSAGES[marketCycle]}
        </div>
      )}
    </div>
  );
};

export default MiniChart;