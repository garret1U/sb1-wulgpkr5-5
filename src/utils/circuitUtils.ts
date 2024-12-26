import { useMemo } from 'react';
import type { Circuit, CircuitDifference, CircuitComparison } from '../types';

// Fields to compare when checking for modifications
const COMPARISON_FIELDS: (keyof Circuit)[] = [
  'carrier',
  'type',
  'purpose',
  'bandwidth',
  'monthlycost',
  'static_ips',
  'upload_bandwidth',
  'contract_term',
  'billing',
  'usage_charges',
  'installation_cost'
];

/**
 * Create a Map of circuits by ID for efficient lookups
 */
function createCircuitMap(circuits: Circuit[]): Map<string, Circuit> {
  return new Map(circuits.map(c => [c.id, c]));
}

/**
 * Compare two circuits to find differences in specific fields
 */
const compareCircuitFields = (active: Circuit, proposed: Circuit): CircuitDifference[] => {
  return COMPARISON_FIELDS.reduce<CircuitDifference[]>((differences, field) => {
    if (active[field] !== proposed[field]) {
      differences.push({
        field,
        oldValue: active[field],
        newValue: proposed[field]
      });
    }
    return differences;
  }, []);
};

/**
 * Compare active and proposed circuits to identify additions, removals, and modifications
 */
export const compareCircuits = (activeCircuits: Circuit[], proposedCircuits: Circuit[]): CircuitComparison => {
  const comparison: CircuitComparison = {
    added: [],
    removed: [],
    modified: []
  };

  // Create maps for faster lookups
  const activeMap = createCircuitMap(activeCircuits);
  const proposedMap = createCircuitMap(proposedCircuits);

  // Find added and modified circuits
  proposedCircuits.forEach(proposed => {
    const active = activeMap.get(proposed.id);
    if (!active) {
      // Circuit exists in proposed but not in active -> Added
      comparison.added.push(proposed);
    } else {
      // Circuit exists in both -> Check for modifications
      const differences = compareCircuitFields(active, proposed);
      if (differences.length > 0) {
        comparison.modified.push({ circuit: proposed, differences });
      }
    }
  });

  // Find removed circuits
  activeCircuits.forEach(active => {
    if (!proposedMap.has(active.id)) {
      // Circuit exists in active but not in proposed -> Removed
      comparison.removed.push(active);
    }
  });

  return comparison;
};

/**
 * Format a circuit difference for display
 */
export function formatDifference(difference: CircuitDifference): string {
  const formatValue = (value: any) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      if (difference.field === 'monthlycost' || difference.field === 'installation_cost') {
        return `$${value.toLocaleString()}`;
      }
      return value.toString();
    }
    return value;
  };

  return `${difference.field}: ${formatValue(difference.oldValue)} → ${formatValue(difference.newValue)}`;
}

/**
 * Calculate total cost impact of circuit changes
 */
export function calculateCostImpact(comparison: CircuitComparison) {
  const addedCost = comparison.added.reduce((sum, circuit) => sum + circuit.monthlycost, 0);
  const removedCost = comparison.removed.reduce((sum, circuit) => sum + circuit.monthlycost, 0);
  const modifiedCost = comparison.modified.reduce((sum, { circuit, differences }) => {
    const costDiff = differences.find(d => d.field === 'monthlycost');
    return sum + (costDiff ? (costDiff.newValue - costDiff.oldValue) : 0);
  }, 0);

  return {
    monthlyImpact: addedCost - removedCost + modifiedCost,
    oneTimeImpact: comparison.added.reduce((sum, circuit) => sum + (circuit.installation_cost || 0), 0)
  };
}

/**
 * Hook to memoize circuit comparison results
 */
export const useCircuitComparison = (activeCircuits: Circuit[], proposedCircuits: Circuit[]) => {
  return useMemo(
    () => compareCircuits(activeCircuits, proposedCircuits),
    [activeCircuits, proposedCircuits]
  );
}