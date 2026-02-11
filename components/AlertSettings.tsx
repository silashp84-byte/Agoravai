
import React, { useEffect } from 'react';

interface AlertSettingsProps {
  enablePushNotifications: boolean;
  onTogglePushNotifications: (enabled: boolean) => void;
  enableSoundAlerts: boolean;
  onToggleSoundAlerts: (enabled: boolean) => void;
  enableVibrationAlerts: boolean;
  onToggleVibrationAlerts: (enabled: boolean) => void;
  enableEarlyPullbackAlerts: boolean;
  onToggleEarlyPullbackAlerts: (enabled: boolean) => void;
}

const AlertSettings: React.FC<AlertSettingsProps> = ({
  enablePushNotifications,
  onTogglePushNotifications,
  enableSoundAlerts,
  onToggleSoundAlerts,
  enableVibrationAlerts,
  onToggleVibrationAlerts,
  enableEarlyPullbackAlerts,
  onToggleEarlyPullbackAlerts,
}) => {
  const handlePushNotificationToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      if (!('Notification' in window)) {
        alert('This browser does not support desktop notifications.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onTogglePushNotifications(true);
      } else {
        alert('Notification permission denied. Please enable it in your browser settings.');
        onTogglePushNotifications(false); // Ensure checkbox unchecks if permission denied
      }
    } else {
      onTogglePushNotifications(false);
    }
  };

  const handleVibrationToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked && !('vibrate' in navigator)) {
      alert('This device/browser does not support vibration.');
      onToggleVibrationAlerts(false); // Ensure checkbox unchecks if not supported
    } else {
      onToggleVibrationAlerts(checked);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-200 mb-4 border-b border-gray-700 pb-2">
        Alert Settings
      </h2>
      <div className="space-y-3">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            checked={enablePushNotifications}
            onChange={handlePushNotificationToggle}
          />
          <span className="ml-3 text-gray-300">Enable Push Notifications</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            checked={enableSoundAlerts}
            onChange={(e) => onToggleSoundAlerts(e.target.checked)}
          />
          <span className="ml-3 text-gray-300">Enable Sound Alerts</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            checked={enableVibrationAlerts}
            onChange={handleVibrationToggle}
            disabled={!('vibrate' in navigator)}
          />
          <span className="ml-3 text-gray-300">Enable Vibration Alerts {(!('vibrate' in navigator) && <span className="text-gray-500 text-xs">(Not supported)</span>)}</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            checked={enableEarlyPullbackAlerts}
            onChange={(e) => onToggleEarlyPullbackAlerts(e.target.checked)}
          />
          <span className="ml-3 text-gray-300">Enable Early Pullback Alert (EMA 20)</span>
        </label>
      </div>
    </div>
  );
};

export default AlertSettings;
