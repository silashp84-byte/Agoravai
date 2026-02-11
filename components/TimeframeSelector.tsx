
import React from 'react';
import { TIMEFRAME_OPTIONS } from '../constants';

interface TimeframeSelectorProps {
  selectedTimeframe: keyof typeof TIMEFRAME_OPTIONS;
  onSelect: (timeframe: keyof typeof TIMEFRAME_OPTIONS) => void;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ selectedTimeframe, onSelect }) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onSelect(event.target.value as keyof typeof TIMEFRAME_OPTIONS);
  };

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="timeframe-select" className="text-gray-300 text-sm font-medium">
        Timeframe:
      </label>
      <select
        id="timeframe-select"
        value={selectedTimeframe}
        onChange={handleChange}
        className="block w-24 p-2 text-base text-gray-900 bg-gray-200 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
      >
        {Object.keys(TIMEFRAME_OPTIONS).map((tf) => (
          <option key={tf} value={tf}>
            {tf}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TimeframeSelector;
