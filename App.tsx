
import React, { useState, useEffect, useRef, useCallback } from 'react';
import AssetSelector from './components/AssetSelector';
import TimeframeSelector from './components/TimeframeSelector';
import AlertSettings from './components/AlertSettings';
import Chart from './components/Chart';
import AlertDisplay from './components/AlertDisplay';
import { getInitialCandleData, subscribeToMarketData, unsubscribeFromMarketData } from './services/marketDataService';
import { calculateAllIndicators, checkForBuyCallAlert, checkForSellPutAlert, checkForEarlyPullbackAlert } from './utils/calculations';
import { CandleData, IndicatorData, SupportResistance, Alert, AlertType } from './types';
import { MOCK_ASSETS, CHART_DATA_LIMIT, TIMEFRAME_OPTIONS, ALERT_SOUND_PATH } from './constants';
import { format } from 'date-fns';

interface SubscriptionHandle {
  intervalId: number;
}

const App: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<string>(MOCK_ASSETS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<keyof typeof TIMEFRAME_OPTIONS>('1m');
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [indicatorData, setIndicatorData] = useState<IndicatorData[]>([]);
  const [supportResistance, setSupportResistance] = useState<SupportResistance>({ support: null, resistance: null });
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Alert settings states
  const [enablePushNotifications, setEnablePushNotifications] = useState<boolean>(false);
  const [enableSoundAlerts, setEnableSoundAlerts] = useState<boolean>(false);
  const [enableVibrationAlerts, setEnableVibrationAlerts] = useState<boolean>(false);
  const [enableEarlyPullbackAlerts, setEnableEarlyPullbackAlerts] = useState<boolean>(false);

  const marketDataSubscription = useRef<SubscriptionHandle | null>(null);
  const previousIndicatorDataRef = useRef<IndicatorData | null>(null);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    alertAudioRef.current = new Audio(ALERT_SOUND_PATH);
    alertAudioRef.current.load(); // Preload the audio
    return () => {
      alertAudioRef.current?.pause();
      alertAudioRef.current = null;
    };
  }, []);

  const triggerAlertNotifications = useCallback((alert: Alert) => {
    // Browser Push Notification
    if (enablePushNotifications && Notification.permission === 'granted') {
      new Notification(`Trading Alert - ${alert.asset}`, {
        body: alert.message,
        icon: '/favicon.ico', // You might want to provide a relevant icon
      });
    }

    // Sound Alert
    if (enableSoundAlerts) {
      alertAudioRef.current?.play().catch(e => console.error("Error playing sound:", e));
    }

    // Vibration Alert (now explicitly controlled here if enabled)
    // The previous condition `(!enablePushNotifications || Notification.permission !== 'granted')`
    // is removed because `Notification` no longer handles vibration internally with this setup.
    if (enableVibrationAlerts && 'vibrate' in navigator) {
      navigator.vibrate(500); // Vibrate for 500ms
    }
  }, [enablePushNotifications, enableSoundAlerts, enableVibrationAlerts]);

  const addAlert = useCallback((newAlert: Alert) => {
    setAlerts(prevAlerts => {
      // Prevent duplicate alerts for the same timestamp/type/asset
      const isDuplicate = prevAlerts.some(alert =>
        alert.type === newAlert.type && alert.timestamp === newAlert.timestamp && alert.asset === newAlert.asset
      );
      if (!isDuplicate) {
        triggerAlertNotifications(newAlert);
        return [...prevAlerts, newAlert];
      }
      return prevAlerts;
    });
  }, [triggerAlertNotifications]);

  const handleNewCandle = useCallback((newCandle: CandleData) => {
    setCandleData(prevData => {
      const updatedData = [...prevData, newCandle];
      return updatedData.slice(-CHART_DATA_LIMIT);
    });
  }, []);

  const handleSelectAsset = useCallback((asset: string) => {
    setSelectedAsset(asset);
    setCandleData([]); // Clear old data
    setAlerts([]); // Clear old alerts
    previousIndicatorDataRef.current = null; // Reset previous indicator data for new asset
  }, []);

  const handleSelectTimeframe = useCallback((timeframe: keyof typeof TIMEFRAME_OPTIONS) => {
    setSelectedTimeframe(timeframe);
    setCandleData([]); // Clear old data
    setAlerts([]); // Clear old alerts
    previousIndicatorDataRef.current = null; // Reset previous indicator data for new timeframe
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  }, []);

  // Effect for market data subscription
  useEffect(() => {
    // Unsubscribe from previous asset/timeframe if active
    if (marketDataSubscription.current) {
      unsubscribeFromMarketData(marketDataSubscription.current);
    }

    const timeframeMs = TIMEFRAME_OPTIONS[selectedTimeframe];

    // Fetch initial data
    const initialCandles = getInitialCandleData(selectedAsset, CHART_DATA_LIMIT, timeframeMs);
    setCandleData(initialCandles);

    // Subscribe to real-time data for the new asset/timeframe
    marketDataSubscription.current = subscribeToMarketData(selectedAsset, initialCandles, handleNewCandle, timeframeMs);

    // Cleanup on component unmount or asset/timeframe change
    return () => {
      if (marketDataSubscription.current) {
        unsubscribeFromMarketData(marketDataSubscription.current);
      }
    };
  }, [selectedAsset, selectedTimeframe, handleNewCandle]);

  // Effect for calculations and alerts
  useEffect(() => {
    if (candleData.length > 0) {
      const { indicators, supportResistance: sr } = calculateAllIndicators(candleData);
      setIndicatorData(indicators);
      setSupportResistance(sr);

      const currentCandle = candleData[candleData.length - 1];
      const previousCandles = candleData.slice(0, -1); // All candles except the current one
      const currentIndicator = indicators[indicators.length - 1];
      const prevIndicator = previousIndicatorDataRef.current; // Last full indicator data before current candle

      if (prevIndicator) {
        // Check for BUY (CALL) alert
        const buyCallAlert = checkForBuyCallAlert(selectedAsset, currentCandle, previousCandles, currentIndicator, prevIndicator);
        if (buyCallAlert) {
          addAlert(buyCallAlert);
        }

        // Check for SELL (PUT) alert
        const sellPutAlert = checkForSellPutAlert(selectedAsset, currentCandle, previousCandles, currentIndicator, prevIndicator);
        if (sellPutAlert) {
          addAlert(sellPutAlert);
        }
      }

      // Check for Early Pullback alert
      if (enableEarlyPullbackAlerts) {
        const earlyPullbackAlert = checkForEarlyPullbackAlert(selectedAsset, currentCandle, currentIndicator);
        if (earlyPullbackAlert) {
          addAlert(earlyPullbackAlert);
        }
      }

      // Update previous indicator data for the next check
      previousIndicatorDataRef.current = currentIndicator;
    } else {
      setIndicatorData([]);
      setSupportResistance({ support: null, resistance: null });
      previousIndicatorDataRef.current = null; // Reset if no data
    }
  }, [candleData, selectedAsset, addAlert, enableEarlyPullbackAlerts]); // Recalculate whenever candleData changes

  const latestCandle = candleData.length > 0 ? candleData[candleData.length - 1] : null;
  const latestIndicators = indicatorData.length > 0 ? indicatorData[indicatorData.length - 1] : null;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gray-900 text-gray-100">
      <header className="w-full max-w-7xl mb-6 flex flex-col sm:flex-row justify-between items-center bg-gray-800 p-4 rounded-lg shadow-lg z-10 sticky top-4">
        <h1 className="text-3xl font-bold text-blue-400 mb-4 sm:mb-0">Trading Monitor</h1>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <AssetSelector
            assets={MOCK_ASSETS}
            selectedAsset={selectedAsset}
            onSelect={handleSelectAsset}
          />
          <TimeframeSelector
            selectedTimeframe={selectedTimeframe}
            onSelect={handleSelectTimeframe}
          />
          <div className="flex flex-col text-sm text-right">
            {latestCandle && (
              <>
                <p>
                  Current Price ({selectedAsset}):{' '}
                  <span className="font-semibold text-yellow-400">
                    {latestCandle.close.toFixed(2)}
                  </span>
                </p>
                <p className="text-gray-400">
                  Updated: {format(new Date(latestCandle.timestamp), 'HH:mm:ss')}
                </p>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        <section className="lg:col-span-2">
          {candleData.length > 0 && indicatorData.length > 0 ? (
            <Chart
              candleData={candleData}
              indicatorData={indicatorData}
              supportResistance={supportResistance}
            />
          ) : (
            <div className="h-80 md:h-[400px] lg:h-[500px] bg-gray-800 rounded-lg flex items-center justify-center">
              <p className="text-gray-400 text-lg">Loading chart data for {selectedAsset} ({selectedTimeframe})...</p>
            </div>
          )}
        </section>

        <aside className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-gray-800 p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-200 mb-4 border-b border-gray-700 pb-2">
              Indicators Summary
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                EMA 10 (Fast):{' '}
                <span className="font-medium text-purple-400">
                  {latestIndicators?.ema10 !== null ? latestIndicators?.ema10?.toFixed(2) : 'N/A'}
                </span>
              </p>
              <p>
                EMA 20 (Medium):{' '}
                <span className="font-medium text-orange-400">
                  {latestIndicators?.ema20 !== null ? latestIndicators?.ema20?.toFixed(2) : 'N/A'}
                </span>
              </p>
              <p>
                EMA 50 (Slow):{' '}
                <span className="font-medium text-cyan-400">
                  {latestIndicators?.ema50 !== null ? latestIndicators?.ema50?.toFixed(2) : 'N/A'}
                </span>
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700 space-y-2 text-sm">
              <p>
                Support Level:{' '}
                <span className="font-medium text-green-400">
                  {supportResistance.support !== null ? supportResistance.support.toFixed(2) : 'N/A'}
                </span>
              </p>
              <p>
                Resistance Level:{' '}
                <span className="font-medium text-red-400">
                  {supportResistance.resistance !== null ? supportResistance.resistance.toFixed(2) : 'N/A'}
                </span>
              </p>
            </div>
          </div>

          <AlertSettings
            enablePushNotifications={enablePushNotifications}
            onTogglePushNotifications={setEnablePushNotifications}
            enableSoundAlerts={enableSoundAlerts}
            onToggleSoundAlerts={setEnableSoundAlerts}
            enableVibrationAlerts={enableVibrationAlerts}
            onToggleVibrationAlerts={setEnableVibrationAlerts}
            enableEarlyPullbackAlerts={enableEarlyPullbackAlerts}
            onToggleEarlyPullbackAlerts={setEnableEarlyPullbackAlerts}
          />

          <AlertDisplay alerts={alerts} onDismissAlert={dismissAlert} />
        </aside>
      </main>

      <footer className="w-full max-w-7xl mt-8 text-center text-gray-500 text-sm p-4 bg-gray-800 rounded-lg shadow-md">
        &copy; {new Date().getFullYear()} Real-time Trading Monitor. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
