
import React from 'react';
import { Alert, AlertType } from '../types';
import { ALERT_MESSAGES } from '../constants';
import { format } from 'date-fns';

interface AlertDisplayProps {
  alerts: Alert[];
  onDismissAlert: (id: string) => void;
}

const AlertDisplay: React.FC<AlertDisplayProps> = ({ alerts, onDismissAlert }) => {
  if (alerts.length === 0) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg text-center text-gray-400 text-sm">
        No active alerts.
      </div>
    );
  }

  const getAlertStyle = (type: AlertType) => {
    switch (type) {
      case AlertType.BUY_CALL:
        return 'bg-green-700 bg-opacity-30 border-green-600';
      case AlertType.SELL_PUT:
        return 'bg-red-700 bg-opacity-30 border-red-600';
      case AlertType.EARLY_PULLBACK_EMA20:
        return 'bg-yellow-700 bg-opacity-30 border-yellow-600';
      default:
        return 'bg-blue-700 bg-opacity-30 border-blue-600';
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-md max-h-64 overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-200 mb-3 border-b border-gray-700 pb-2">
        Active Alerts
      </h3>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`relative p-3 rounded-md border flex items-center justify-between ${getAlertStyle(alert.type)}`}
            role="alert"
            aria-live="polite"
          >
            <div>
              <p className="text-sm font-medium text-gray-50">
                {ALERT_MESSAGES[alert.type] || alert.message}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Asset: {alert.asset} | {format(new Date(alert.timestamp), 'MMM dd, HH:mm:ss')}
              </p>
            </div>
            <button
              onClick={() => onDismissAlert(alert.id)}
              className="ml-4 p-1 rounded-full text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Dismiss alert"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertDisplay;