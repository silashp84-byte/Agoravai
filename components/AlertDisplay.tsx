
import React from 'react';
import { Alert, AlertType } from '../types';
import { ALERT_MESSAGES } from '../constants';
import { format } from 'date-fns';

interface AlertDisplayProps {
  alerts: Alert[];
  onDismissAlert: (id: string) => void;
  // UPDATED: Prop for alert counts, now nested by asset
  alertCounts: Record<string, Record<AlertType, number>>; 
}

const AlertDisplay: React.FC<AlertDisplayProps> = ({ alerts, onDismissAlert, alertCounts }) => {
  const getAlertStyle = (type: AlertType) => {
    switch (type) {
      case AlertType.BUY_CALL: return 'bg-green-700 bg-opacity-30 border-green-600';
      case AlertType.SELL_PUT: return 'bg-red-700 bg-opacity-30 border-red-600';
      case AlertType.EARLY_PULLBACK_EMA20_BULLISH: return 'bg-green-800 bg-opacity-40 border-green-500';
      case AlertType.EARLY_PULLBACK_EMA20_BEARISH: return 'bg-red-800 bg-opacity-40 border-red-500';
      case AlertType.TARGET_LINE_CONFIRMATION_BULLISH:
      case AlertType.TARGET_LINE_CONFIRMATION_BEARISH: return 'bg-purple-700 bg-opacity-30 border-purple-600';
      case AlertType.TARGET_FOLLOW_THROUGH_BULLISH:
      case AlertType.TARGET_FOLLOW_THROUGH_BEARISH: return 'bg-indigo-700 bg-opacity-30 border-indigo-600';
      default: return 'bg-blue-700 bg-opacity-30 border-blue-600';
    }
  };

  const getAlertDescription = (type: AlertType) => {
    // Return a more user-friendly name for each alert type
    switch (type) {
      case AlertType.BUY_CALL: return 'Buy Call';
      case AlertType.SELL_PUT: return 'Sell Put';
      case AlertType.EARLY_PULLBACK_EMA20_BULLISH: return 'Bullish EMA20 Pullback';
      case AlertType.EARLY_PULLBACK_EMA20_BEARISH: return 'Bearish EMA20 Pullback';
      case AlertType.TARGET_LINE_CONFIRMATION_BULLISH: return 'Target Bullish Confirmation';
      case AlertType.TARGET_LINE_CONFIRMATION_BEARISH: return 'Target Bearish Confirmation';
      case AlertType.TARGET_FOLLOW_THROUGH_BULLISH: return 'Target Bullish Follow-Through';
      case AlertType.TARGET_FOLLOW_THROUGH_BEARISH: return 'Target Bearish Follow-Through';
      default: return String(type); // Fallback for any unknown types
    }
  }

  const hasActiveAlerts = alerts.length > 0;
  
  // UPDATED: Check if any asset has any alert count > 0
  // Fix: Explicitly cast assetSpecificCounts to its known type for Object.values to resolve 'unknown' error.
  const hasAlertTotals = Object.values(alertCounts).some(assetSpecificCounts =>
    Object.values(assetSpecificCounts as { [key: string]: number }).some(count => count > 0)
  );

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md max-h-64 overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-200 mb-3 border-b border-gray-700 pb-2">Active Alerts</h3>
      {hasActiveAlerts ? (
        <div className="space-y-3 mb-4">
          {alerts.map((alert) => (
            <div key={alert.id} className={`relative p-3 rounded-md border flex items-center justify-between ${getAlertStyle(alert.type)}`}>
              <div>
                <p className="text-sm font-medium text-gray-50">{ALERT_MESSAGES[alert.type] || alert.message}</p>
                <p className="text-xs text-gray-300 mt-1">{alert.asset} | {format(new Date(alert.timestamp), 'HH:mm:ss')}</p>
              </div>
              <button onClick={() => onDismissAlert(alert.id)} className="p-1 rounded-full text-gray-300 hover:bg-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-2 text-center text-gray-400 text-sm mb-4">No active alerts.</div>
      )}

      {hasAlertTotals && (
        <>
          <h3 className="text-lg font-semibold text-gray-200 mt-4 mb-3 border-b border-gray-700 pb-2">
            Alert Totals
          </h3>
          <div className="space-y-3 text-sm"> {/* Increased spacing for clarity */}
            {Object.entries(alertCounts)
              .filter(([, assetSpecificCounts]) => Object.values(assetSpecificCounts as { [key: string]: number }).some(count => count > 0)) // Only show assets that have alerts
              .map(([asset, assetSpecificCounts]) => (
                <div key={asset} className="bg-gray-700 p-3 rounded-md border border-gray-600"> {/* Added styling for each asset block */}
                  <p className="font-bold text-gray-100 border-b border-gray-600 pb-1 mb-2">{asset}:</p> {/* Asset name as header */}
                  <div className="pl-3 space-y-1"> {/* Indent and space alert types */}
                    {/* Fix: Explicitly cast assetSpecificCounts to its known type for Object.entries to resolve 'unknown' error. */}
                    {Object.entries(assetSpecificCounts as { [key: string]: number })
                      .filter(([, count]) => count > 0) // Only show types with counts > 0 for this asset, 'count' is now inferred as number
                      .map(([type, count]) => (
                        <p key={type} className="flex justify-between items-center text-gray-300">
                          <span className="font-medium">{getAlertDescription(type as AlertType)}:</span>
                          <span className="font-bold text-blue-400">{count}</span>
                        </p>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AlertDisplay;
