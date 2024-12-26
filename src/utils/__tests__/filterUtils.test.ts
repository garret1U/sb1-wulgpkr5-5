import { filterCircuits, sortCircuits } from '../filterUtils';
import type { Circuit, CircuitComparison } from '../../types';

describe('filterCircuits', () => {
  const baseCircuit: Circuit = {
    id: '1',
    carrier: 'AT&T',
    type: 'MPLS',
    bandwidth: '100 Mbps',
    monthlycost: 1000
  } as Circuit;

  const comparison: CircuitComparison = {
    added: [baseCircuit],
    removed: [],
    modified: []
  };

  it('should filter by type', () => {
    const result = filterCircuits(comparison, { type: 'added' });
    expect(result.added).toHaveLength(1);
    expect(result.removed).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
  });

  it('should filter by search term', () => {
    const result = filterCircuits(comparison, { 
      type: 'all',
      search: 'AT&T'
    });
    expect(result.added).toHaveLength(1);

    const noMatch = filterCircuits(comparison, {
      type: 'all',
      search: 'Verizon'
    });
    expect(noMatch.added).toHaveLength(0);
  });

  it('should filter by carrier', () => {
    const result = filterCircuits(comparison, {
      type: 'all',
      carrier: 'AT&T'
    });
    expect(result.added).toHaveLength(1);

    const noMatch = filterCircuits(comparison, {
      type: 'all',
      carrier: 'Verizon'
    });
    expect(noMatch.added).toHaveLength(0);
  });
});

describe('sortCircuits', () => {
  const circuits: Circuit[] = [
    { id: '1', carrier: 'Verizon', monthlycost: 1000 } as Circuit,
    { id: '2', carrier: 'AT&T', monthlycost: 500 } as Circuit
  ];

  const comparison: CircuitComparison = {
    added: circuits,
    removed: [],
    modified: []
  };

  it('should sort by string field ascending', () => {
    const result = sortCircuits(comparison, {
      field: 'carrier',
      direction: 'asc'
    });
    expect(result.added[0].carrier).toBe('AT&T');
    expect(result.added[1].carrier).toBe('Verizon');
  });

  it('should sort by string field descending', () => {
    const result = sortCircuits(comparison, {
      field: 'carrier',
      direction: 'desc'
    });
    expect(result.added[0].carrier).toBe('Verizon');
    expect(result.added[1].carrier).toBe('AT&T');
  });

  it('should sort by numeric field ascending', () => {
    const result = sortCircuits(comparison, {
      field: 'monthlycost',
      direction: 'asc'
    });
    expect(result.added[0].monthlycost).toBe(500);
    expect(result.added[1].monthlycost).toBe(1000);
  });

  it('should sort by numeric field descending', () => {
    const result = sortCircuits(comparison, {
      field: 'monthlycost',
      direction: 'desc'
    });
    expect(result.added[0].monthlycost).toBe(1000);
    expect(result.added[1].monthlycost).toBe(500);
  });
});