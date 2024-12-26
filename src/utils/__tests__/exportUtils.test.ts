import { exportDifferencesAsCSV, exportDifferencesAsExcel } from '../exportUtils';
import type { Circuit, CircuitComparison } from '../../types';

describe('exportDifferencesAsCSV', () => {
  const baseCircuit: Circuit = {
    id: '1',
    carrier: 'AT&T',
    type: 'MPLS',
    purpose: 'Primary',
    bandwidth: '100 Mbps',
    monthlycost: 1000,
    static_ips: 4,
    upload_bandwidth: '50 Mbps',
    contract_term: 36,
    billing: 'Monthly',
    usage_charges: false,
    installation_cost: 500,
    location_id: 'loc1'
  } as Circuit;

  const comparison: CircuitComparison = {
    added: [baseCircuit],
    removed: [],
    modified: []
  };

  beforeEach(() => {
    // Mock DOM methods
    global.URL.createObjectURL = jest.fn();
    global.URL.revokeObjectURL = jest.fn();
    document.createElement = jest.fn().mockReturnValue({
      setAttribute: jest.fn(),
      click: jest.fn(),
      style: {}
    });
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
  });

  it('should generate CSV with correct headers', () => {
    exportDifferencesAsCSV(comparison);
    
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    const blob = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0];
    const content = new TextDecoder().decode(blob);
    
    expect(content).toContain('Type,Carrier,Circuit Type,Purpose,Bandwidth');
  });

  it('should handle special characters in CSV', () => {
    const circuitWithCommas: Circuit = {
      ...baseCircuit,
      carrier: 'AT&T, Inc.'
    } as Circuit;

    exportDifferencesAsCSV({
      ...comparison,
      added: [circuitWithCommas]
    });

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    const blob = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0];
    const content = new TextDecoder().decode(blob);
    
    expect(content).toContain('"AT&T, Inc."');
  });
});

describe('exportDifferencesAsExcel', () => {
  const baseCircuit: Circuit = {
    id: '1',
    carrier: 'AT&T',
    type: 'MPLS',
    purpose: 'Primary',
    bandwidth: '100 Mbps',
    monthlycost: 1000,
    static_ips: 4,
    upload_bandwidth: '50 Mbps',
    contract_term: 36,
    billing: 'Monthly',
    usage_charges: false,
    installation_cost: 500,
    location_id: 'loc1'
  } as Circuit;

  const comparison: CircuitComparison = {
    added: [baseCircuit],
    removed: [],
    modified: []
  };

  it('should call XLSX.writeFile with correct data', async () => {
    const mockXLSX = {
      utils: {
        book_new: jest.fn().mockReturnValue({}),
        json_to_sheet: jest.fn().mockReturnValue({}),
        book_append_sheet: jest.fn()
      },
      writeFile: jest.fn()
    };

    jest.mock('xlsx', () => mockXLSX);

    await exportDifferencesAsExcel(comparison);

    expect(mockXLSX.utils.book_new).toHaveBeenCalled();
    expect(mockXLSX.utils.json_to_sheet).toHaveBeenCalled();
    expect(mockXLSX.writeFile).toHaveBeenCalled();
  });
});