
import React from 'react';
import MiniChart from './MiniChart';
import { AssetMonitorState, Alert } from '../types';

interface MiniChartGridProps {
  allAssetsData: Record<string, AssetMonitorState>;
  allAssetsAlerts: Alert[]; // Pass alerts to MiniChartGrid
  selectedAsset: string;
  onSelectAsset: (asset: string) => void;
  mockAssets: string[];
}

const MiniChartGrid: React.FC<MiniChartGridProps> = ({
  allAssetsData,
  allAssetsAlerts, // Destructure new prop
  selectedAsset,
  onSelectAsset,
  mockAssets,
}) => {
  return (
    <div className="bg-green-900 rounded-xl shadow-md p-4 mb-6">
      <h2 className="text-xl font-semibold text-lime-100 mb-4 border-b border-green-800 pb-2">
        Monitored Assets
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mockAssets.map((asset) => {
          const assetData = allAssetsData[asset];
          if (!assetData || assetData.candleData.length === 0) {
            return (
              <div key={asset} className="bg-green-800 rounded-xl shadow-md p-4 text-center text-gray-400">
                Loading {asset}...
              </div>
            );
          }
          const assetSpecificAlerts = allAssetsAlerts.filter(alert => alert.asset === selectedAsset); // Filter alerts for this asset
          return (
            <MiniChart
              key={asset}
              asset={asset}
              candleData={assetData.candleData}
              indicatorData={assetData.indicatorData}
              isSelected={asset === selectedAsset}
              assetAlerts={assetSpecificAlerts} // Pass filtered alerts
              marketCycle={assetData.marketCycle} // NEW: Pass marketCycle
              onClick={onSelectAsset}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MiniChartGrid;