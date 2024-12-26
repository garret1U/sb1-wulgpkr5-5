import React from 'react';
import { Plus, Minus, RefreshCw, DollarSign } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { debounce } from 'lodash';
import { exportDifferencesAsCSV, exportDifferencesAsExcel } from '../../utils/exportUtils';
import { useNotification } from '../../contexts/NotificationContext';
import { useLocationCircuits } from '../../hooks/useCircuits';
import { useCircuitRealtimeSync } from '../../hooks/useRealtimeSync';
import { usePermissions } from '../../hooks/usePermissions';
import { useCircuitComparison, calculateCostImpact, formatDifference } from '../../utils/circuitUtils';
import { filterCircuits, sortCircuits } from '../../utils/filterUtils';
import type { CircuitFilter, CircuitSort } from '../../types/filters';

interface CircuitDifferencesProps {
  proposalId: string;
  locationId: string;
}

export function CircuitDifferences({ proposalId, locationId }: CircuitDifferencesProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const { canModifyCircuits } = usePermissions();
  const { showNotification } = useNotification();
  const [filter, setFilter] = React.useState<CircuitFilter>({
    type: 'all',
    search: ''
  });
  const [sort, setSort] = React.useState<CircuitSort>({
    field: 'carrier',
    direction: 'asc'
  });
  const { activeCircuits, proposedCircuits, isLoading, isError } = useLocationCircuits(
    proposalId,
    locationId
  );

  // Set up real-time sync
  useCircuitRealtimeSync(proposalId, locationId);

  // Memoize circuit comparison
  const comparison = useCircuitComparison(activeCircuits, proposedCircuits);
  // Apply filters and sorting
  const filteredComparison = React.useMemo(() => {
    let result = filterCircuits(comparison, filter);
    return sortCircuits(result, sort);
  }, [comparison, filter, sort]);

  // Set up virtualization for large lists
  const rowVirtualizer = useVirtualizer({
    count: filteredComparison.added.length + filteredComparison.removed.length + filteredComparison.modified.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5
  });

  // Debounced search handler
  const handleSearch = React.useMemo(
    () => debounce((value: string) => {
      setFilter(prev => ({ ...prev, search: value }));
    }, 300),
    []
  );
  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-red-500 dark:text-red-400 p-4 text-center">
        Error loading circuit data
      </div>
    );
  }


  if (!comparison.added.length && !comparison.removed.length && !comparison.modified.length) {
    return (
      <div className="text-gray-500 dark:text-gray-400 p-4 text-center">
        No changes to review
      </div>
    );
  }

  // Memoize cost impact calculation
  const { monthlyImpact, oneTimeImpact } = React.useMemo(() => calculateCostImpact(comparison), [comparison]);

  if (!canModifyCircuits && !comparison.added.length && !comparison.removed.length && !comparison.modified.length) {
    return (
      <div className="text-gray-500 dark:text-gray-400 p-4 text-center">
        You don't have permission to modify circuits
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Controls */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => {
            try {
              exportDifferencesAsCSV(comparison);
              showNotification({
                type: 'success',
                message: 'Circuit differences exported to CSV'
              });
            } catch (error) {
              showNotification({
                type: 'error',
                message: 'Failed to export circuit differences'
              });
            }
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                   hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 
                   dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Export as CSV
        </button>
        <button
          onClick={async () => {
            try {
              await exportDifferencesAsExcel(comparison);
              showNotification({
                type: 'success',
                message: 'Circuit differences exported to Excel'
              });
            } catch (error) {
              showNotification({
                type: 'error',
                message: 'Failed to export circuit differences'
              });
            }
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                   hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 
                   dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Export as Excel
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search circuits..."
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <select
          value={filter.type}
          onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value as CircuitFilter['type'] }))}
          className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Changes</option>
          <option value="added">Added Only</option>
          <option value="removed">Removed Only</option>
          <option value="modified">Modified Only</option>
        </select>
        <select
          value={`${sort.field}-${sort.direction}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split('-');
            setSort({ field: field as CircuitSort['field'], direction: direction as CircuitSort['direction'] });
          }}
          className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="carrier-asc">Carrier (A-Z)</option>
          <option value="carrier-desc">Carrier (Z-A)</option>
          <option value="type-asc">Type (A-Z)</option>
          <option value="type-desc">Type (Z-A)</option>
          <option value="bandwidth-asc">Bandwidth (Low-High)</option>
          <option value="bandwidth-desc">Bandwidth (High-Low)</option>
          <option value="monthlycost-asc">Cost (Low-High)</option>
          <option value="monthlycost-desc">Cost (High-Low)</option>
        </select>
      </div>
      {/* Cost Impact Summary */}
      <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Cost Impact
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Monthly Impact</div>
            <div className={`text-xl font-semibold ${
              monthlyImpact >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {monthlyImpact >= 0 ? '+' : ''}{monthlyImpact.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
              })}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">One-time Impact</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {oneTimeImpact.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Changes List */}
      <div className="space-y-4">
        <div ref={parentRef} className="h-[400px] overflow-auto">
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              let item;
              if (virtualRow.index < comparison.added.length) {
                item = (
                  <div className="p-3 rounded-lg border border-green-200 dark:border-green-900/50 
                               bg-green-50 dark:bg-green-900/20">
                    {/* Added circuit content */}
                  </div>
                );
              } else if (virtualRow.index < comparison.added.length + comparison.removed.length) {
                item = (
                  <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/50 
                               bg-red-50 dark:bg-red-900/20">
                    {/* Removed circuit content */}
                  </div>
                );
              } else {
                item = (
                  <div className="p-3 rounded-lg border border-yellow-200 dark:border-yellow-900/50 
                               bg-yellow-50 dark:bg-yellow-900/20">
                    {/* Modified circuit content */}
                  </div>
                );
              }

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  {item}
                </div>
              );
            })}
          </div>
        </div>

        {/* Added Circuits */}
        {comparison.added.length > 0 && (
          <div>
            <h4 className="flex items-center space-x-2 text-green-600 dark:text-green-400 font-medium mb-2">
              <Plus className="h-4 w-4" />
              <span>Added Circuits</span>
            </h4>
            <div className="space-y-2">
              {comparison.added.map(circuit => (
                <div
                  key={circuit.id}
                  className="p-3 rounded-lg border border-green-200 dark:border-green-900/50 
                           bg-green-50 dark:bg-green-900/20"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {circuit.carrier} - {circuit.type}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {circuit.bandwidth} - ${circuit.monthlycost.toLocaleString()}/mo
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Removed Circuits */}
        {comparison.removed.length > 0 && (
          <div>
            <h4 className="flex items-center space-x-2 text-red-600 dark:text-red-400 font-medium mb-2">
              <Minus className="h-4 w-4" />
              <span>Removed Circuits</span>
            </h4>
            <div className="space-y-2">
              {comparison.removed.map(circuit => (
                <div
                  key={circuit.id}
                  className="p-3 rounded-lg border border-red-200 dark:border-red-900/50 
                           bg-red-50 dark:bg-red-900/20"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {circuit.carrier} - {circuit.type}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {circuit.bandwidth} - ${circuit.monthlycost.toLocaleString()}/mo
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modified Circuits */}
        {comparison.modified.length > 0 && (
          <div>
            <h4 className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400 font-medium mb-2">
              <RefreshCw className="h-4 w-4" />
              <span>Modified Circuits</span>
            </h4>
            <div className="space-y-2">
              {comparison.modified.map(({ circuit, differences }) => (
                <div
                  key={circuit.id}
                  className="p-3 rounded-lg border border-yellow-200 dark:border-yellow-900/50 
                           bg-yellow-50 dark:bg-yellow-900/20"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {circuit.carrier} - {circuit.type}
                  </div>
                  <div className="mt-2 space-y-1">
                    {differences.map((diff, index) => (
                      <div key={index} className="text-sm text-gray-600 dark:text-gray-300">
                        {formatDifference(diff)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}