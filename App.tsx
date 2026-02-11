import React, { useState, useEffect, useRef, useCallback } from 'react';
import MiniChartGrid from './components/MiniChartGrid'; // New import
import TimeframeSelector from './components/TimeframeSelector';
import AlertSettings from './components/AlertSettings';
import Chart from './components/Chart';
import AlertDisplay from './components/AlertDisplay';
import { getInitialCandleData, subscribeToMarketData, unsubscribeFromMarketData } from './services/marketDataService';
import { calculateAllIndicators, checkForBuyCallAlert, checkForSellPutAlert, checkForEarlyPullbackAlert, checkForTargetLineConfirmationAlert } from './utils/calculations';
import { CandleData, IndicatorData, SupportResistance, Alert, AlertType, AssetMonitorState } from './types';
import { MOCK_ASSETS, CHART_DATA_LIMIT, TIMEFRAME_OPTIONS, ALERT_SOUND_PATH, ALERT_DURATION_MS } from './constants';
import { format } from 'date-fns';

// Fix: Define SubscriptionHandle type to explicitly match what unsubscribeFromMarketData expects
interface SubscriptionHandle {
  intervalId: number;
}

interface SubscriptionHandles {
  [asset: string]: SubscriptionHandle | null;
}
interface PreviousIndicatorDataRef {
  [asset: string]: IndicatorData | null;
}

const App: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<string>(MOCK_ASSETS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<keyof typeof TIMEFRAME_OPTIONS>('1m');
  
  // State to hold data for ALL monitored assets
  const [allAssetsData, setAllAssetsData] = useState<Record<string, AssetMonitorState>>(() => {
    const initialState: Record<string, AssetMonitorState> = {};
    MOCK_ASSETS.forEach(asset => {
      initialState[asset] = {
        candleData: [],
        indicatorData: [],
        supportResistance: { support: null, resistance: null },
      };
    });
    return initialState;
  });

  const [alerts, setAlerts] = useState<Alert[]>([]);
  // New state for dynamic target line
  const [targetLineValues, setTargetLineValues] = useState<Record<string, number | null>>(() => {
    const initialTargetState: Record<string, number | null> = {};
    MOCK_ASSETS.forEach(asset => {
      initialTargetState[asset] = null;
    });
    return initialTargetState;
  });

  // Alert settings states
  const [enablePushNotifications, setEnablePushNotifications] = useState<boolean>(false);
  const [enableSoundAlerts, setEnableSoundAlerts] = useState<boolean>(false);
  const [enableVibrationAlerts, setEnableVibrationAlerts] = useState<boolean>(false);
  const [enableEarlyPullbackAlerts, setEnableEarlyPullbackAlerts] = useState<boolean>(false);

  const marketDataSubscriptions = useRef<SubscriptionHandles>({});
  const previousIndicatorDataRef = useRef<PreviousIndicatorDataRef>({});
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
      if (alertAudioRef.current) {
        alertAudioRef.current.currentTime = 0; // Rewind to start
        alertAudioRef.current.play().catch(e => console.error("Error playing sound:", e));

        // Stop after ALERT_DURATION_MS if still playing
        setTimeout(() => {
          if (alertAudioRef.current) {
            alertAudioRef.current.pause();
            alertAudioRef.current.currentTime = 0; // Reset for next play
          }
        }, ALERT_DURATION_MS);
      }
    }

    // Vibration Alert
    if (enableVibrationAlerts && 'vibrate' in navigator) {
      navigator.vibrate(ALERT_DURATION_MS); // Vibrate for ALERT_DURATION_MS
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

  const handleNewCandle = useCallback((asset: string, newCandle: CandleData) => {
    setAllAssetsData(prevAllAssetsData => {
      const currentAssetData = prevAllAssetsData[asset];
      if (!currentAssetData) return prevAllAssetsData; // Should not happen if initialized correctly

      const updatedCandleData = [...currentAssetData.candleData, newCandle].slice(-CHART_DATA_LIMIT);

      // Recalculate indicators and S/R for this specific asset's updated data
      const { indicators, supportResistance: sr } = calculateAllIndicators(updatedCandleData);
      const currentIndicator = indicators.length > 0 ? indicators[indicators.length - 1] : null;
      const prevIndicator = previousIndicatorDataRef.current[asset] || null;
      const previousCandles = updatedCandleData.slice(0, -1); // All candles except the very last one (newCandle)
      const currentTargetLineValueForAsset = targetLineValues[asset]; // Get the most recent target line for this asset

      // Check for alerts for this asset
      if (currentIndicator && updatedCandleData.length > 1) { // Ensure enough data for checks
        
        if (prevIndicator) {
          const buyCallAlert = checkForBuyCallAlert(asset, newCandle, previousCandles, currentIndicator, prevIndicator);
          if (buyCallAlert) addAlert(buyCallAlert);

          const sellPutAlert = checkForSellPutAlert(asset, newCandle, previousCandles, currentIndicator, prevIndicator);
          if (sellPutAlert) addAlert(sellPutAlert);
        }

        if (enableEarlyPullbackAlerts) {
          // Pass previousCandles for context to determine pullback direction
          const earlyPullbackAlert = checkForEarlyPullbackAlert(asset, newCandle, previousCandles, currentIndicator);
          if (earlyPullbackAlert) addAlert(earlyPullbackAlert);
        }

        // NEW: Check for Target Line Confirmation Alert
        const targetLineConfirmAlert = checkForTargetLineConfirmationAlert(asset, newCandle, previousCandles, currentTargetLineValueForAsset);
        if (targetLineConfirmAlert) addAlert(targetLineConfirmAlert);
      }

      previousIndicatorDataRef.current = {
        ...previousIndicatorDataRef.current,
        [asset]: currentIndicator,
      };

      return {
        ...prevAllAssetsData,
        [asset]: {
          candleData: updatedCandleData,
          indicatorData: indicators,
          supportResistance: sr,
        },
      };
    });
  }, [addAlert, enableEarlyPullbackAlerts, targetLineValues]); // Depend on targetLineValues now

  const handleSelectAsset = useCallback((asset: string) => {
    setSelectedAsset(asset);
  }, []);

  const handleSelectTimeframe = useCallback((timeframe: keyof typeof TIMEFRAME_OPTIONS) => {
    setSelectedTimeframe(timeframe);
    // When timeframe changes, all subscriptions need to be reset and re-initialized
    setAllAssetsData({}); // Clear all data
    setAlerts([]); // Clear alerts
    previousIndicatorDataRef.current = {}; // Reset previous indicator data for all assets
    setTargetLineValues({}); // Clear target lines as well
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  }, []);

  // Effect for market data subscriptions for ALL assets
  useEffect(() => {
    // Fix: Explicitly cast the values from Object.values to SubscriptionHandle | null
    Object.values(marketDataSubscriptions.current).forEach((sub: SubscriptionHandle | null) => {
      if (sub) unsubscribeFromMarketData(sub);
    });
    marketDataSubscriptions.current = {}; // Clear current subscriptions

    const newSubscriptions: SubscriptionHandles = {};
    const newAllAssetsData: Record<string, AssetMonitorState> = {};
    const newPreviousIndicatorDataRef: PreviousIndicatorDataRef = {};
    const timeframeMs = TIMEFRAME_OPTIONS[selectedTimeframe];

    MOCK_ASSETS.forEach(asset => {
      const initialCandles = getInitialCandleData(asset, CHART_DATA_LIMIT, timeframeMs);
      const { indicators, supportResistance: sr } = calculateAllIndicators(initialCandles);

      newAllAssetsData[asset] = {
        candleData: initialCandles,
        indicatorData: indicators,
        supportResistance: sr,
      };
      newPreviousIndicatorDataRef[asset] = indicators.length > 0 ? indicators[indicators.length - 1] : null;

      newSubscriptions[asset] = subscribeToMarketData(
        asset,
        initialCandles,
        (newCandle) => handleNewCandle(asset, newCandle),
        timeframeMs
      );
    });

    setAllAssetsData(newAllAssetsData);
    marketDataSubscriptions.current = newSubscriptions;
    previousIndicatorDataRef.current = newPreviousIndicatorDataRef;

    // Set the initial selected asset if the old one isn't in MOCK_ASSETS anymore or if it's the first load
    if (!MOCK_ASSETS.includes(selectedAsset) && MOCK_ASSETS.length > 0) {
      setSelectedAsset(MOCK_ASSETS[0]);
    } else if (MOCK_ASSETS.length > 0 && selectedAsset === '') {
      setSelectedAsset(MOCK_ASSETS[0]);
    }


    // Cleanup on component unmount or asset/timeframe change
    return () => {
      // Fix: Explicitly cast the values from Object.values to SubscriptionHandle | null
      Object.values(marketDataSubscriptions.current).forEach((sub: SubscriptionHandle | null) => {
        if (sub) unsubscribeFromMarketData(sub);
      });
    };
  }, [selectedTimeframe, handleNewCandle, selectedAsset]); // Re-run when timeframe changes

  // Effect to update the dynamic target line every 90 seconds (independent of chart timeframe)
  useEffect(() => {
    const targetUpdateInterval = setInterval(() => {
      setTargetLineValues(prevTargets => {
        const newTargets = { ...prevTargets };
        MOCK_ASSETS.forEach(asset => {
          const assetCandleData = allAssetsData[asset]?.candleData;
          if (assetCandleData && assetCandleData.length > 0) {
            const latestCandle = assetCandleData[assetCandleData.length - 1];
            // Simple Classic Pivot Point calculation for demonstration
            const pivot = (latestCandle.high + latestCandle.low + latestCandle.close) / 3;
            newTargets[asset] = parseFloat(pivot.toFixed(2));
          } else {
            newTargets[asset] = null;
          }
        });
        return newTargets;
      });
    }, TIMEFRAME_OPTIONS['90s']); // Use the 90s timeframe constant for the interval

    return () => clearInterval(targetUpdateInterval);
  }, [allAssetsData]); // Rerun when allAssetsData changes (new candles arrive)

  const currentAssetData = allAssetsData[selectedAsset] || {
    candleData: [],
    indicatorData: [],
    supportResistance: { support: null, resistance: null },
  };

  const latestCandle = currentAssetData.candleData.length > 0 ? currentAssetData.candleData[currentAssetData.candleData.length - 1] : null;
  const latestIndicators = currentAssetData.indicatorData.length > 0 ? currentAssetData.indicatorData[currentAssetData.indicatorData.length - 1] : null;
  const currentTargetLineValue = targetLineValues[selectedAsset];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gray-900 text-gray-100">
      <header className="w-full max-w-7xl mb-6 flex flex-col sm:flex-row justify-between items-center bg-gray-800 p-4 rounded-lg shadow-lg z-10 sticky top-4">
        <h1 className="text-3xl font-bold text-blue-400 mb-4 sm:mb-0">Trading Monitor</h1>
        <div className="flex flex-col md:flex-row items-center gap-4">
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

      <main className="w-full max-w-7xl flex-grow">
        {/* Mini Chart Grid */}
        <MiniChartGrid
          allAssetsData={allAssetsData}
          allAssetsAlerts={alerts}
          selectedAsset={selectedAsset}
          onSelectAsset={handleSelectAsset}
          mockAssets={MOCK_ASSETS}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            {currentAssetData.candleData.length > 0 && currentAssetData.indicatorData.length > 0 ? (
              <Chart
                candleData={currentAssetData.candleData}
                indicatorData={currentAssetData.indicatorData}
                supportResistance={currentAssetData.supportResistance}
                alerts={alerts} // Pass all alerts
                selectedAsset={selectedAsset} // Pass selected asset to filter alerts in Chart
                targetLineValue={currentTargetLineValue} // Pass the target line value
              />
            ) : (
              <div className="h-80 md:h-[400px] lg:h-[500px] bg-gray-800 rounded-lg flex items-center justify-center">
                <p className="text-gray-400 text-lg">Loading chart data for {selectedAsset} ({selectedTimeframe})..</p>
              </div>
            )}
          </section>

          <aside className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-gray-800 p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-200 mb-4 border-b border-gray-700 pb-2">
                Indicators Summary ({selectedAsset})
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
                    {currentAssetData.supportResistance.support !== null ? currentAssetData.supportResistance.support.toFixed(2) : 'N/A'}
                  </span>
                </p>
                <p>
                  Resistance Level:{' '}
                  <span className="font-medium text-red-400">
                    {currentAssetData.supportResistance.resistance !== null ? currentAssetData.supportResistance.resistance.toFixed(2) : 'N/A'}
                  </span>
                </p>
                {currentTargetLineValue !== null && (
                  <p>
                    Target Line:{' '}
                    <span className="font-medium text-yellow-500">
                      {currentTargetLineValue.toFixed(2)}
                    </span>
                  </p>
                )}
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
        </div>
      </main>

      <footer className="w-full max-w-7xl mt-8 text-center text-gray-500 text-sm p-4 bg-gray-800 rounded-lg shadow-md">
        &copy; {new Date().getFullYear()} Real-time Trading Monitor. All rights reserved.
      </footer>
    </div>
  );
};

export default App;