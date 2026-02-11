import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Line,
  ReferenceLine,
  ReferenceDot,
  Bar, // Import Bar component for volume
} from 'recharts';
import { CandleData, IndicatorData, SupportResistance, Alert, AlertType } from '../types';
import { format } from 'date-fns';

interface ChartProps {
  candleData: CandleData[];
  indicatorData: IndicatorData[];
  supportResistance: SupportResistance;
  alerts: Alert[]; // New prop for displaying alerts
  selectedAsset: string; // New prop to filter alerts for the current chart
  targetLineValue?: number | null; // New prop for the dynamic target line
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-800 bg-opacity-90 border border-gray-600 p-3 rounded-md shadow-lg text-gray-100 text-sm">
        <p className="font-semibold">{format(new Date(label as number), 'MMM dd, HH:mm')}</p>
        <p>Open: <span className="text-blue-400">{data.open}</span></p>
        <p>High: <span className="text-green-400">{data.high}</span></p>
        <p>Low: <span className="text-red-400">{data.low}</span></p>
        <p>Close: <span className="text-yellow-400">{data.close}</span></p>
        {data.ema10 !== null && <p>EMA 10: <span className="text-purple-400">{data.ema10}</span></p>}
        {data.ema20 !== null && <p>EMA 20: <span className="text-orange-400">{data.ema20}</span></p>}
        {data.ema50 !== null && <p>EMA 50: <span className="text-cyan-400">{data.ema50}</span></p>}
        <p>Volume: <span className="text-gray-300">{data.volume}</span></p>
      </div>
    );
  }
  return null;
};

const getAlertColor = (type: AlertType) => {
  switch (type) {
    case AlertType.BUY_CALL:
    case AlertType.EARLY_PULLBACK_EMA20_BULLISH: // Green for bullish pullback
      return '#10B981'; // Tailwind green-500
    case AlertType.SELL_PUT:
    case AlertType.EARLY_PULLBACK_EMA20_BEARISH: // Red for bearish pullback
      return '#EF4444'; // Tailwind red-500
    case AlertType.EARLY_PULLBACK_EMA20: // Fallback for generic, if still used
      return '#F59E0B'; // Tailwind yellow-500
    case AlertType.TARGET_LINE_CONFIRMATION_BULLISH:
      return '#A78BFA'; // Tailwind purple-400 (lighter purple)
    case AlertType.TARGET_LINE_CONFIRMATION_BEARISH:
      return '#6D28D9'; // Tailwind purple-800 (darker purple)
    default:
      return '#60A5FA'; // Default blue
  }
};

const getAlertLabel = (type: AlertType) => {
  switch (type) {
    case AlertType.BUY_CALL:
      return 'BUY';
    case AlertType.SELL_PUT:
      return 'SELL';
    case AlertType.EARLY_PULLBACK_EMA20_BULLISH:
      return 'BULL'; // Label for bullish pullback
    case AlertType.EARLY_PULLBACK_EMA20_BEARISH:
      return 'BEAR'; // Label for bearish pullback
    case AlertType.EARLY_PULLBACK_EMA20: // Fallback for generic, if still used
      return 'PULLBACK';
    case AlertType.TARGET_LINE_CONFIRMATION_BULLISH:
      return 'TARGET BULL';
    case AlertType.TARGET_LINE_CONFIRMATION_BEARISH:
      return 'TARGET BEAR';
    default:
      return '';
  }
};

const Chart: React.FC<ChartProps> = ({ candleData, indicatorData, supportResistance, alerts, selectedAsset, targetLineValue }) => {
  // Combine candleData and indicatorData for Recharts
  const chartData = candleData.map((candle, index) => ({
    ...candle,
    ...indicatorData[index],
    id: candle.timestamp, // Unique ID for each data point
  }));

  const yDomain = [
    Math.min(...candleData.map(c => c.low).filter(v => typeof v === 'number')) * 0.99,
    Math.max(...candleData.map(c => c.high).filter(v => typeof v === 'number')) * 1.01,
  ];

  // Filter alerts relevant to the currently displayed asset
  const filteredAlerts = alerts.filter(alert => alert.asset === selectedAsset);

  return (
    <div className="w-full h-80 md:h-[400px] lg:h-[500px] bg-gray-800 rounded-lg shadow-xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(timestamp) => format(new Date(timestamp), 'HH:mm')}
            minTickGap={30}
            stroke="#999"
            tick={{ fill: '#bbb', fontSize: 10 }}
            interval="preserveStart"
          />
          {/* Y-Axis for Price */}
          <YAxis
            type="number"
            domain={yDomain as [number, number]}
            allowDataOverflow={true}
            stroke="#999"
            tick={{ fill: '#bbb', fontSize: 10 }}
            orientation="right"
            yAxisId="price" // Assign ID for price axis
          />
          {/* Y-Axis for Volume */}
          <YAxis
            type="number"
            orientation="left"
            stroke="#888" // Slightly different color for volume axis
            tick={{ fill: '#bbb', fontSize: 10 }}
            yAxisId="volume" // Assign ID for volume axis
            domain={[0, 'auto']} // Volume always starts from 0
            allowDecimals={false}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px', color: '#ccc' }} />

          {/* Candlestick visualization (simplified to close price line) */}
          <Line
            type="monotone"
            dataKey="close"
            stroke="#60A5FA"
            strokeWidth={1}
            dot={false}
            name="Price"
            yAxisId="price" // Link to price axis
          />

          {/* EMA Lines */}
          <Line
            type="monotone"
            dataKey="ema10"
            stroke="#a78bfa"
            strokeWidth={1.5}
            dot={false}
            name="EMA 10"
            yAxisId="price" // Link to price axis
          />
          <Line
            type="monotone"
            dataKey="ema20"
            stroke="#fb923c"
            strokeWidth={1.5}
            dot={false}
            name="EMA 20"
            yAxisId="price" // Link to price axis
          />
          <Line
            type="monotone"
            dataKey="ema50"
            stroke="#22d3ee"
            strokeWidth={1.5}
            dot={false}
            name="EMA 50"
            yAxisId="price" // Link to price axis
          />

          {/* Volume Bars */}
          <Bar
            dataKey="volume"
            fill="#4A5568" // Darker gray for volume bars
            opacity={0.6}
            name="Volume"
            yAxisId="volume" // Link to volume axis
          />

          {/* Support and Resistance Lines */}
          {supportResistance.support !== null && (
            <ReferenceLine
              y={supportResistance.support}
              label={{ value: `S: ${supportResistance.support}`, position: 'insideTopLeft', fill: '#84cc16', fontSize: 10 }}
              stroke="#84cc16"
              strokeDasharray="3 3"
              yAxisId="price" // Link to price axis
            />
          )}
          {supportResistance.resistance !== null && (
            <ReferenceLine
              y={supportResistance.resistance}
              label={{ value: `R: ${supportResistance.resistance}`, position: 'insideBottomLeft', fill: '#ef4444', fontSize: 10 }}
              stroke="#ef4444"
              strokeDasharray="3 3"
              yAxisId="price" // Link to price axis
            />
          )}

          {/* Dynamic Target Line */}
          {targetLineValue !== null && (
            <ReferenceLine
              y={targetLineValue}
              label={{ value: `Alvo: ${targetLineValue}`, position: 'insideTopRight', fill: '#F59E0B', fontSize: 10 }}
              stroke="#F59E0B"
              strokeDasharray="5 5"
              yAxisId="price" // Link to price axis
            />
          )}

          {/* Alert Markers */}
          {filteredAlerts.map(alert => (
            <ReferenceDot
              key={alert.id}
              x={alert.timestamp}
              y={
                candleData.find(c => c.timestamp === alert.timestamp)?.close ||
                (alert.type === AlertType.BUY_CALL || alert.type === AlertType.EARLY_PULLBACK_EMA20_BULLISH || alert.type === AlertType.TARGET_LINE_CONFIRMATION_BULLISH
                  ? Math.max(...candleData.map(c => c.high)) * 0.99
                  : Math.min(...candleData.map(c => c.low)) * 1.01) // Fallback if candle not found
              }
              r={6} // radius of the dot
              fill={getAlertColor(alert.type)}
              stroke={getAlertColor(alert.type)}
              strokeWidth={2}
              isFront={true}
              className="z-20"
              yAxisId="price" // Link to price axis
            >
              <text x={0} y={-10} fill={getAlertColor(alert.type)} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold">
                {getAlertLabel(alert.type)}
              </text>
            </ReferenceDot>
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Chart;