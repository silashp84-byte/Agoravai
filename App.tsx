
import React, { useState, useEffect, useRef, useCallback } from 'react';
import MiniChartGrid from './components/MiniChartGrid';
import TimeframeSelector from './components/TimeframeSelector';
import AlertSettings from './components/AlertSettings';
import Chart from './components/Chart';
import AlertDisplay from './components/AlertDisplay';
import { getInitialCandleData, subscribeToMarketData, unsubscribeFromMarketData } from './services/marketDataService';
import { calculateAllIndicators, checkForBuyCallAlert, checkForSellPutAlert, checkForEarlyPullbackAlert, checkForTargetLineConfirmationAlert, calculatePivotPoints, checkForFollowThroughAlert, determineMarketCycle } from './utils/calculations';
import { CandleData, IndicatorData, SupportResistance, Alert, AlertType, AssetMonitorState, TargetLevels, MarketCycle } from './types';
import { MOCK_ASSETS, CHART_DATA_LIMIT, TIMEFRAME_OPTIONS, ALERT_SOUND_PATH, ALERT_DURATION_MS } from './constants';
import { format } from 'date-fns';

interface SubscriptionHandle { intervalId: number; }
interface SubscriptionHandles { [asset: string]: SubscriptionHandle | null; }
interface PreviousIndicatorDataRef { [asset: string]: IndicatorData | null; }

const App: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<string>(MOCK_ASSETS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<keyof typeof TIMEFRAME_OPTIONS>('1m');
  const [allAssetsData, setAllAssetsData] = useState<Record<string, AssetMonitorState>>(() => {
    const initialState: Record<string, AssetMonitorState> = {};
    MOCK_ASSETS.forEach(asset => { initialState[asset] = { candleData: [], indicatorData: [], supportResistance: { support: null, resistance: null }, marketCycle: null }; });
    return initialState;
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [targetLevels, setTargetLevels] = useState<Record<string, TargetLevels>>(() => {
    const initial: Record<string, TargetLevels> = {};
    MOCK_ASSETS.forEach(asset => { initial[asset] = { pivot: null, r1: null, s1: null }; });
    return initial;
  });
  const [confirmedDirections, setConfirmedDirections] = useState<Record<string, 'bullish' | 'bearish' | null>>(() => {
    const initial: Record<string, 'bullish' | 'bearish' | null> = {};
    MOCK_ASSETS.forEach(asset => { initial[asset] = null; });
    return initial;
  });

  // UPDATED: State to store counts for each alert type, per asset
  const [alertCounts, setAlertCounts] = useState<Record<string, Record<AlertType, number>>>(() => {
    const initialCounts: Record<string, Record<AlertType, number>> = {};
    MOCK_ASSETS.forEach(asset => {
      initialCounts[asset] = {} as Record<AlertType, number>;
      Object.values(AlertType).forEach(type => {
        initialCounts[asset][type] = 0;
      });
    });
    return initialCounts;
  });

  const [enablePushNotifications, setEnablePushNotifications] = useState<boolean>(false);
  const [enableSoundAlerts, setEnableSoundAlerts] = useState<boolean>(false);
  const [enableVibrationAlerts, setEnableVibrationAlerts] = useState<boolean>(false);
  const [enableEarlyPullbackAlerts, setEnableEarlyPullbackAlerts] = useState<boolean>(false);

  const marketDataSubscriptions = useRef<SubscriptionHandles>({});
  const previousIndicatorDataRef = useRef<PreviousIndicatorDataRef>({});
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    alertAudioRef.current = new Audio(ALERT_SOUND_PATH);
    alertAudioRef.current.load();
    return () => { alertAudioRef.current?.pause(); alertAudioRef.current = null; };
  }, []);

  const triggerAlertNotifications = useCallback((alert: Alert) => {
    if (enablePushNotifications && Notification.permission === 'granted') {
      new Notification(`Trading Alert - ${alert.asset}`, { body: alert.message, icon: '/favicon.ico' });
    }
    if (enableSoundAlerts && alertAudioRef.current) {
      alertAudioRef.current.currentTime = 0;
      alertAudioRef.current.play().catch(e => console.error("Error playing sound:", e));
      setTimeout(() => { if (alertAudioRef.current) { alertAudioRef.current.pause(); alertAudioRef.current.currentTime = 0; } }, ALERT_DURATION_MS);
    }
    if (enableVibrationAlerts && 'vibrate' in navigator) { navigator.vibrate(ALERT_DURATION_MS); }
  }, [enablePushNotifications, enableSoundAlerts, enableVibrationAlerts]);

  const addAlert = useCallback((newAlert: Alert) => {
    setAlerts(prevAlerts => {
      const isDuplicate = prevAlerts.some(alert => alert.type === newAlert.type && alert.timestamp === newAlert.timestamp && alert.asset === newAlert.asset);
      if (!isDuplicate) {
        triggerAlertNotifications(newAlert);
        if (newAlert.type === AlertType.TARGET_LINE_CONFIRMATION_BULLISH) setConfirmedDirections(prev => ({ ...prev, [newAlert.asset]: 'bullish' }));
        if (newAlert.type === AlertType.TARGET_LINE_CONFIRMATION_BEARISH) setConfirmedDirections(prev => ({ ...prev, [newAlert.asset]: 'bearish' }));
        
        // UPDATED: Increment the count for this alert type, for the specific asset
        setAlertCounts(prevCounts => ({
          ...prevCounts,
          [newAlert.asset]: {
            ...(prevCounts[newAlert.asset] || {} as Record<AlertType, number>), // Ensure asset entry exists
            [newAlert.type]: ((prevCounts[newAlert.asset]?.[newAlert.type] as number) || 0) + 1,
          },
        }));

        return [...prevAlerts, newAlert];
      }
      return prevAlerts;
    });
  }, [triggerAlertNotifications]);

  const handleSelectAsset = useCallback((asset: string) => { setSelectedAsset(asset); }, []);
  const handleSelectTimeframe = useCallback((timeframe: keyof typeof TIMEFRAME_OPTIONS) => {
    setSelectedTimeframe(timeframe);
    setAllAssetsData({});
    setAlerts([]);
    previousIndicatorDataRef.current = {};
    setTargetLevels({});
    setConfirmedDirections({});
    // UPDATED: Reset alert counts per asset when timeframe changes
    setAlertCounts(() => {
      const resetCounts: Record<string, Record<AlertType, number>> = {};
      MOCK_ASSETS.forEach(asset => {
        resetCounts[asset] = {} as Record<AlertType, number>;
        Object.values(AlertType).forEach(type => {
          resetCounts[asset][type] = 0;
        });
      });
      return resetCounts;
    });
  }, []);
  const dismissAlert = useCallback((id: string) => { setAlerts(prev => prev.filter(a => a.id !== id)); }, []);

  const handleNewCandle = useCallback((asset: string, newCandle: CandleData) => {
    setAllAssetsData(prevAllAssetsData => {
      const currentAssetData = prevAllAssetsData[asset];
      if (!currentAssetData) return prevAllAssetsData;

      const updatedCandleData = [...currentAssetData.candleData, newCandle].slice(-CHART_DATA_LIMIT);
      const { indicators: updatedIndicators, supportResistance: updatedSR } = calculateAllIndicators(updatedCandleData);
      const latestIndicators = updatedIndicators.length > 0 ? updatedIndicators[updatedIndicators.length - 1] : null;

      const prevIndicators = previousIndicatorDataRef.current[asset];
      
      let currentMarketCycle: MarketCycle | null = null;
      if (latestIndicators && updatedCandleData.length > 1 && prevIndicators) {
        currentMarketCycle = determineMarketCycle(newCandle, latestIndicators, updatedCandleData.slice(0, -1), prevIndicators);
      }

      if (latestIndicators && updatedCandleData.length > 1) {
        // --- Alert Checks ---
        const previousCandles = updatedCandleData.slice(0, -1); // All candles except the very last one (newCandle)
        
        // Ensure previousIndicators are available for alerts that need them
        if (prevIndicators) {
          const buyAlert = checkForBuyCallAlert(asset, newCandle, previousCandles, latestIndicators, prevIndicators);
          if (buyAlert) addAlert(buyAlert);

          const sellAlert = checkForSellPutAlert(asset, newCandle, previousCandles, latestIndicators, prevIndicators);
          if (sellAlert) addAlert(sellAlert);
        }

        if (enableEarlyPullbackAlerts) {
          const earlyPullbackAlert = checkForEarlyPullbackAlert(asset, newCandle, previousCandles, latestIndicators);
          if (earlyPullbackAlert) addAlert(earlyPullbackAlert);
        }

        // Target Line Confirmation & Follow-Through
        const currentAssetTargets = targetLevels[asset];
        if (currentAssetTargets?.pivot) {
          const confirmationAlert = checkForTargetLineConfirmationAlert(asset, newCandle, previousCandles, currentAssetTargets.pivot);
          if (confirmationAlert) addAlert(confirmationAlert);
        }
        if (confirmedDirections[asset]) {
          const followThroughAlert = checkForFollowThroughAlert(asset, newCandle, previousCandles, confirmedDirections[asset]);
          if (followThroughAlert) addAlert(followThroughAlert);
        }
      }

      // Update previous indicators ref
      previousIndicatorDataRef.current[asset] = latestIndicators;

      return {
        ...prevAllAssetsData,
        [asset]: {
          candleData: updatedCandleData,
          indicatorData: updatedIndicators,
          supportResistance: updatedSR,
          marketCycle: currentMarketCycle, // NEW: Update market cycle here
        },
      };
    });
  }, [addAlert, enableEarlyPullbackAlerts, targetLevels, confirmedDirections]); // Dependencies for useCallback

  useEffect(() => {
    Object.values(marketDataSubscriptions.current).forEach((sub: SubscriptionHandle | null) => { if (sub) unsubscribeFromMarketData(sub); });
    marketDataSubscriptions.current = {};
    const newSubscriptions: SubscriptionHandles = {};
    const newAllAssetsData: Record<string, AssetMonitorState> = {};
    const newPreviousIndicatorDataRef: PreviousIndicatorDataRef = {};
    const timeframeMs = TIMEFRAME_OPTIONS[selectedTimeframe];
    MOCK_ASSETS.forEach(asset => {
      const initialCandles = getInitialCandleData(asset, CHART_DATA_LIMIT, timeframeMs);
      const { indicators, supportResistance: sr } = calculateAllIndicators(initialCandles);
      const initialPrevIndicators = indicators.length > 0 ? indicators[indicators.length - 1] : null;
      // Pass null for previous candles to determineMarketCycle on initial load as there's no 'previous candle' yet for the first set
      const initialMarketCycle = initialPrevIndicators ? determineMarketCycle(initialCandles[initialCandles.length - 1], initialPrevIndicators, initialCandles.slice(0, -1), null) : null;

      newAllAssetsData[asset] = { candleData: initialCandles, indicatorData: indicators, supportResistance: sr, marketCycle: initialMarketCycle };
      newPreviousIndicatorDataRef[asset] = initialPrevIndicators;
      newSubscriptions[asset] = subscribeToMarketData(asset, initialCandles, (nc) => handleNewCandle(asset, nc), timeframeMs);
    });
    setAllAssetsData(newAllAssetsData);
    marketDataSubscriptions.current = newSubscriptions;
    previousIndicatorDataRef.current = newPreviousIndicatorDataRef;
  }, [selectedTimeframe, handleNewCandle]);

  useEffect(() => {
    const targetUpdateInterval = setInterval(() => {
      setTargetLevels(prev => {
        const next = { ...prev };
        MOCK_ASSETS.forEach(asset => {
          const assetCandles = allAssetsData[asset]?.candleData;
          if (assetCandles && assetCandles.length > 0) {
            next[asset] = calculatePivotPoints(assetCandles[assetCandles.length - 1]);
          } else {
            next[asset] = { pivot: null, r1: null, s1: null };
          }
        });
        return next;
      });
      setConfirmedDirections(prev => {
        const next = { ...prev };
        MOCK_ASSETS.forEach(asset => { next[asset] = null; });
        return next;
      });
    }, TIMEFRAME_OPTIONS['90s']);
    return () => clearInterval(targetUpdateInterval);
  }, [allAssetsData]);

  const currentAssetData = allAssetsData[selectedAsset] || { candleData: [], indicatorData: [], supportResistance: { support: null, resistance: null }, marketCycle: null };
  const latestCandle = currentAssetData.candleData.length > 0 ? currentAssetData.candleData[currentAssetData.candleData.length - 1] : null;
  const latestIndicators = currentAssetData.indicatorData.length > 0 ? currentAssetData.indicatorData[currentAssetData.indicatorData.length - 1] : null;
  const currentTargets = targetLevels[selectedAsset] || { pivot: null, r1: null, s1: null };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-green-950 text-gray-100">
      <header className="w-full max-w-7xl mb-6 flex flex-col sm:flex-row justify-between items-center bg-green-900 p-4 rounded-xl shadow-lg z-10 sticky top-4">
        <h1 className="text-3xl font-bold text-lime-400 mb-4 sm:mb-0">Trading Monitor</h1>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <TimeframeSelector selectedTimeframe={selectedTimeframe} onSelect={handleSelectTimeframe} />
          <div className="flex flex-col text-sm text-right">
            {latestCandle && (
              <>
                <p>Price ({selectedAsset}): <span className="font-semibold text-lime-400">{latestCandle.close.toFixed(2)}</span></p>
                <p className="text-yellow-300">Updated: {format(new Date(latestCandle.timestamp), 'HH:mm:ss')}</p>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="w-full max-w-7xl flex-grow">
        <MiniChartGrid allAssetsData={allAssetsData} allAssetsAlerts={alerts} selectedAsset={selectedAsset} onSelectAsset={handleSelectAsset} mockAssets={MOCK_ASSETS} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            {currentAssetData.candleData.length > 0 ? (
              <Chart candleData={currentAssetData.candleData} indicatorData={currentAssetData.indicatorData} supportResistance={currentAssetData.supportResistance} alerts={alerts} selectedAsset={selectedAsset} targetLineValue={currentTargets.pivot} r1={currentTargets.r1} s1={currentTargets.s1} selectedTimeframe={selectedTimeframe} />
            ) : (
              <div className="h-80 md:h-[400px] lg:h-[500px] bg-green-900 rounded-xl flex items-center justify-center">
                <p className="text-lime-400 text-lg">Loading {selectedAsset} data...</p>
              </div>
            )}
          </section>
          <aside className="lg:col-span-1 flex flex-col gap-6">
            {/* Moved AlertDisplay to the top of the right sidebar for prominence */}
            <AlertDisplay alerts={alerts} onDismissAlert={dismissAlert} alertCounts={alertCounts} />
            <div className="bg-green-900 p-4 rounded-xl shadow-md text-sm">
              <h2 className="text-xl font-semibold text-lime-100 mb-4 border-b border-green-800 pb-2">Targets ({selectedAsset})</h2>
              <div className="space-y-2">
                <p>Resistance 1: <span className="font-medium text-pink-400">{currentTargets.r1?.toFixed(2) || 'N/A'}</span></p>
                <p>Pivot Point: <span className="font-medium text-yellow-300">{currentTargets.pivot?.toFixed(2) || 'N/A'}</span></p>
                <p>Support 1: <span className="font-medium text-cyan-400">{currentTargets.s1?.toFixed(2) || 'N/A'}</span></p>
              </div>
              <div className="mt-4 pt-4 border-t border-green-800">
                <p>EMA 10: <span className="text-fuchsia-400">{latestIndicators?.ema10?.toFixed(2) || 'N/A'}</span></p>
                <p>EMA 20: <span className="text-cyan-400">{latestIndicators?.ema20?.toFixed(2) || 'N/A'}</span></p>
                <p>EMA 50: <span className="text-lime-500">{latestIndicators?.ema50?.toFixed(2) || 'N/A'}</span></p>
              </div>
            </div>
            <AlertSettings enablePushNotifications={enablePushNotifications} onTogglePushNotifications={setEnablePushNotifications} enableSoundAlerts={enableSoundAlerts} onToggleSoundAlerts={setEnableSoundAlerts} enableVibrationAlerts={enableVibrationAlerts} onToggleVibrationAlerts={setEnableVibrationAlerts} enableEarlyPullbackAlerts={enableEarlyPullbackAlerts} onToggleEarlyPullbackAlerts={setEnableEarlyPullbackAlerts} />
          </aside>
        </div>
      </main>
      <footer className="w-full max-w-7xl mt-8 text-center text-yellow-300 text-sm p-4 bg-green-900 rounded-xl shadow-md">&copy; {new Date().getFullYear()} Real-time Trading Monitor.</footer>
    </div>
  );
};

export default App;