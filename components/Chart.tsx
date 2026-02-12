
import React from 'react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Line, ReferenceLine, ReferenceDot, ReferenceArea, Bar } from 'recharts';
import { CandleData, IndicatorData, SupportResistance, Alert, AlertType } from '../types';
import { TIMEFRAME_OPTIONS } from '../constants';
import { format } from 'date-fns';

interface ChartProps {
  candleData: CandleData[];
  indicatorData: IndicatorData[];
  supportResistance: SupportResistance;
  alerts: Alert[];
  selectedAsset: string;
  targetLineValue?: number | null;
  r1?: number | null;
  s1?: number | null;
  selectedTimeframe: keyof typeof TIMEFRAME_OPTIONS;
}

const getAlertColor = (type: AlertType) => {
  switch (type) {
    case AlertType.BUY_CALL:
    case AlertType.EARLY_PULLBACK_EMA20_BULLISH:
      return '#10B981';
    case AlertType.SELL_PUT:
    case AlertType.EARLY_PULLBACK_EMA20_BEARISH:
      return '#EF4444';
    case AlertType.TARGET_LINE_CONFIRMATION_BULLISH:
      return '#A78BFA';
    case AlertType.TARGET_LINE_CONFIRMATION_BEARISH:
      return '#6D28D9';
    case AlertType.TARGET_FOLLOW_THROUGH_BULLISH:
      return '#C084FC';
    case AlertType.TARGET_FOLLOW_THROUGH_BEARISH:
      return '#4C1D95';
    default:
      return '#60A5FA';
  }
};

const getAlertLabel = (type: AlertType) => {
  switch (type) {
    case AlertType.BUY_CALL: return 'BUY';
    case AlertType.SELL_PUT: return 'SELL';
    case AlertType.EARLY_PULLBACK_EMA20_BULLISH: return 'BULL';
    case AlertType.EARLY_PULLBACK_EMA20_BEARISH: return 'BEAR';
    case AlertType.TARGET_LINE_CONFIRMATION_BULLISH: return 'TGT BULL';
    case AlertType.TARGET_LINE_CONFIRMATION_BEARISH: return 'TGT BEAR';
    case AlertType.TARGET_FOLLOW_THROUGH_BULLISH: return '🚀';
    case AlertType.TARGET_FOLLOW_THROUGH_BEARISH: return '☄️';
    default: return '';
  }
};

const Chart: React.FC<ChartProps> = ({ candleData, indicatorData, supportResistance, alerts, selectedAsset, targetLineValue, r1, s1, selectedTimeframe }) => {
  const chartData = candleData.map((candle, index) => ({ ...candle, ...indicatorData[index], id: candle.timestamp }));
  const yDomain = [Math.min(...candleData.map(c => c.low)) * 0.995, Math.max(...candleData.map(c => c.high)) * 1.005];
  const filteredAlerts = alerts.filter(alert => alert.asset === selectedAsset);
  const candleWidthMs = TIMEFRAME_OPTIONS[selectedTimeframe];

  return (
    <div className="w-full h-80 md:h-[400px] lg:h-[500px] bg-gray-800 rounded-lg shadow-xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="timestamp" tickFormatter={(t) => format(new Date(t), 'HH:mm')} minTickGap={30} stroke="#999" tick={{ fill: '#bbb', fontSize: 10 }} />
          <YAxis type="number" domain={yDomain as [number, number]} orientation="right" yAxisId="price" stroke="#999" tick={{ fill: '#bbb', fontSize: 10 }} />
          <YAxis type="number" orientation="left" yAxisId="volume" stroke="#555" tick={false} domain={[0, 'auto']} />
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f9fafb' }} />
          <Legend />
          <Bar dataKey="volume" fill="#374151" yAxisId="volume" opacity={0.3} name="Volume" />
          <Line type="monotone" dataKey="close" stroke="#60A5FA" strokeWidth={1.5} dot={false} name="Price" yAxisId="price" />
          <Line type="monotone" dataKey="ema10" stroke="#a78bfa" strokeWidth={1} dot={false} name="EMA 10" yAxisId="price" />
          <Line type="monotone" dataKey="ema20" stroke="#fb923c" strokeWidth={1} dot={false} name="EMA 20" yAxisId="price" />
          {supportResistance.support && <ReferenceLine y={supportResistance.support} stroke="#10B981" strokeDasharray="3 3" yAxisId="price" />}
          {supportResistance.resistance && <ReferenceLine y={supportResistance.resistance} stroke="#EF4444" strokeDasharray="3 3" yAxisId="price" />}
          {targetLineValue && <ReferenceLine y={targetLineValue} stroke="#F59E0B" strokeDasharray="5 5" yAxisId="price" label={{ value: 'Pivot', fill: '#F59E0B', fontSize: 10 }} />}
          {r1 && <ReferenceLine y={r1} stroke="#EC4899" strokeDasharray="5 5" opacity={0.5} yAxisId="price" label={{ value: 'R1', fill: '#EC4899', fontSize: 10 }} />}
          {s1 && <ReferenceLine y={s1} stroke="#3B82F6" strokeDasharray="5 5" opacity={0.5} yAxisId="price" label={{ value: 'S1', fill: '#3B82F6', fontSize: 10 }} />}

          {filteredAlerts.map(alert => (
            <React.Fragment key={alert.id}>
              {/* Fix: replaced 't' with 'c.timestamp' in the find callback */}
              <ReferenceDot x={alert.timestamp} y={candleData.find(c => c.timestamp === alert.timestamp)?.close || alert.breakPriceRegion?.target || yDomain[1]} r={6} fill={getAlertColor(alert.type)} isFront={true} yAxisId="price">
                <text y={-12} fill={getAlertColor(alert.type)} textAnchor="middle" fontSize={10} fontWeight="bold">{getAlertLabel(alert.type)}</text>
              </ReferenceDot>
              {alert.breakPriceRegion && (
                <ReferenceArea x1={alert.timestamp - candleWidthMs / 2} x2={alert.timestamp + candleWidthMs / 2} y1={alert.breakPriceRegion.low} y2={alert.breakPriceRegion.high} fill={getAlertColor(alert.type)} fillOpacity={0.15} yAxisId="price" isFront={true} />
              )}
            </React.Fragment>
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Chart;
