
import React from 'react';

interface AssetSelectorProps {
  assets: string[];
  selectedAsset: string;
  onSelect: (asset: string) => void;
}

const AssetSelector: React.FC<AssetSelectorProps> = ({ assets, selectedAsset, onSelect }) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onSelect(event.target.value);
  };

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="asset-select" className="text-gray-300 text-sm font-medium">
        Select Asset:
      </label>
      <select
        id="asset-select"
        value={selectedAsset}
        onChange={handleChange}
        className="block w-40 p-2 text-base text-gray-900 bg-gray-200 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
      >
        {assets.map((asset) => (
          <option key={asset} value={asset}>
            {asset}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AssetSelector;
