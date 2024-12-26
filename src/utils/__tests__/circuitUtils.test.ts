import { compareCircuits, calculateCostImpact } from '../circuitUtils';
import type { Circuit } from '../../types';

describe('compareCircuits', () => {
  const baseCircuit: Circuit = {
    id: '1',
    carrier: 'AT&T',
    type: 'MPLS',
    purpose: 'Primary',
    status: 'Active',
    bandwidth: '100 Mbps',
    monthlycost: 1000,
    static_ips: 4,
    upload_bandwidth: '50 Mbps',
    contract_term: 36,
    billing: 'Monthly',
    usage_charges: false,
    installation_cost: 500,
    location_id: 'loc1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  };

  it('should identify added circuits', () => {
    const activeCircuits: Circuit[] = [];
    const proposedCircuits: Circuit[] = [baseCircuit];

    const result = compareCircuits(activeCircuits, proposedCircuits);

    expect(result.added).toHaveLength(1);
    expect(result.removed).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
    expect(result.added[0]).toEqual(baseCircuit);
  });

  it('should identify removed circuits', () => {
    const activeCircuits: Circuit[] = [baseCircuit];
    const proposedCircuits: Circuit[] = [];

    const result = compareCircuits(activeCircuits, proposedCircuits);

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(1);
    expect(result.modified).toHaveLength(0);
    expect(result.removed[0]).toEqual(baseCircuit);
  });

  it('should identify modified circuits', () => {
    const activeCircuits: Circuit[] = [baseCircuit];
    const proposedCircuits: Circuit[] = [{
      ...baseCircuit,
      bandwidth: '200 Mbps',
      monthlycost: 1500
    }];

    const result = compareCircuits(activeCircuits, proposedCircuits);

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.modified).toHaveLength(1);
    expect(result.modified[0].differences).toHaveLength(2);
    expect(result.modified[0].differences).toContainEqual({
      field: 'bandwidth',
      oldValue: '100 Mbps',
      newValue: '200 Mbps'
    });
    expect(result.modified[0].differences).toContainEqual({
      field: 'monthlycost',
      oldValue: 1000,
      newValue: 1500
    });
  });

  it('should handle empty arrays', () => {
    const result = compareCircuits([], []);

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
  });
});

describe('calculateCostImpact', () => {
  const baseCircuit: Circuit = {
    id: '1',
    monthlycost: 1000,
    installation_cost: 500,
    // ... other required fields
  } as Circuit;

  it('should calculate cost impact for added circuits', () => {
    const comparison = {
      added: [baseCircuit],
      removed: [],
      modified: []
    };

    const impact = calculateCostImpact(comparison);

    expect(impact.monthlyImpact).toBe(1000);
    expect(impact.oneTimeImpact).toBe(500);
  });

  it('should calculate cost impact for removed circuits', () => {
    const comparison = {
      added: [],
      removed: [baseCircuit],
      modified: []
    };

    const impact = calculateCostImpact(comparison);

    expect(impact.monthlyImpact).toBe(-1000);
    expect(impact.oneTimeImpact).toBe(0);
  });

  it('should calculate cost impact for modified circuits', () => {
    const comparison = {
      added: [],
      removed: [],
      modified: [{
        circuit: { ...baseCircuit, monthlycost: 1500 },
        differences: [{
          field: 'monthlycost',
          oldValue: 1000,
          newValue: 1500
        }]
      }]
    };

    const impact = calculateCostImpact(comparison);

    expect(impact.monthlyImpact).toBe(500);
    expect(impact.oneTimeImpact).toBe(0);
  });
});