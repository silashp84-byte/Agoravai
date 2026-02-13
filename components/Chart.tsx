
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
      return '#34D399'; // Emerald-400
    case AlertType.SELL_PUT:
    case AlertType.EARLY_PULLBACK_EMA20_BEARISH:
      return '#F472B6'; // Pink-400
    case AlertType.TARGET_LINE_CONFIRMATION_BULLISH:
      return '#E879F9'; // Fuchsia-400
    case AlertType.TARGET_LINE_CONFIRMATION_BEARISH:
      return '#D946EF'; // Fuchsia-500
    case AlertType.TARGET_FOLLOW_THROUGH_BULLISH:
      return '#22D3EE'; // Cyan-400
    case AlertType.TARGET_FOLLOW_THROUGH_BEARISH:
      return '#06B6D4'; // Cyan-500
    default:
      return '#A1A1AA'; // Gray-400
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
    <div className="w-full h-80 md:h-[400px] lg:h-[500px] bg-green-900 rounded-xl shadow-xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1C3B20" /> {/* Dark green grid */}
          <XAxis dataKey="timestamp" tickFormatter={(t) => format(new Date(t), 'HH:mm')} minTickGap={30} stroke="#86EFAC" tick={{ fill: '#D9F99D', fontSize: 10 }} /> {/* Light green/lime axis */}
          <YAxis type="number" domain={yDomain as [number, number]} orientation="right" yAxisId="price" stroke="#86EFAC" tick={{ fill: '#D9F99D', fontSize: 10 }} /> {/* Light green/lime axis */}
          <YAxis type="number" orientation="left" yAxisId="volume" stroke="#374151" tick={false} domain={[0, 'auto']} /> {/* Darker gray for volume axis */}
          <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#166534', color: '#f9fafb' }} /> {/* Dark bg, green border tooltip */}
          <Legend />
          <Bar dataKey="volume" fill="#166534" yAxisId="volume" opacity={0.3} name="Volume" /> {/* Dark green volume bars */}
          <Line type="monotone" dataKey="close" stroke="#A7F3D0" strokeWidth={1.5} dot={false} name="Price" yAxisId="price" /> {/* Aqua green price line */}
          <Line type="monotone" dataKey="ema10" stroke="#F472B6" strokeWidth={1} dot={false} name="EMA 10" yAxisId="price" /> {/* Pink EMA 10 */}
          <Line type="monotone" dataKey="ema20" stroke="#67E8F9" strokeWidth={1} dot={false} name="EMA 20" yAxisId="price" /> {/* Cyan EMA 20 */}
          <Line type="monotone" dataKey="ema50" stroke="#BEF264" strokeWidth={1} dot={false} name="EMA 50" yAxisId="price" /> {/* Lime EMA 50 */}
          {supportResistance.support && <ReferenceLine y={supportResistance.support} stroke="#22D3EE" strokeDasharray="3 3" yAxisId="price" label={{ value: 'Support', fill: '#22D3EE', fontSize: 10 }} />} {/* Cyan support */}
          {supportResistance.resistance && <ReferenceLine y={supportResistance.resistance} stroke="#FB7185" strokeDasharray="3 3" yAxisId="price" label={{ value: 'Resistance', fill: '#FB7185', fontSize: 10 }} />} {/* Rose resistance */}
          {targetLineValue && <ReferenceLine y={targetLineValue} stroke="#FACC15" strokeDasharray="5 5" yAxisId="price" label={{ value: 'Pivot', fill: '#FACC15', fontSize: 10 }} />} {/* Yellow neon pivot */}
          {r1 && <ReferenceLine y={r1} stroke="#F472B6" strokeDasharray="5 5" opacity={0.7} yAxisId="price" label={{ value: 'R1', fill: '#F472B6', fontSize: 10 }} />} {/* Pink R1 */}
          {s1 && <ReferenceLine y={s1} stroke="#67E8F9" strokeDasharray="5 5" opacity={0.7} yAxisId="price" label={{ value: 'S1', fill: '#67E8F9', fontSize: 10 }} />} {/* Cyan S1 */}

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