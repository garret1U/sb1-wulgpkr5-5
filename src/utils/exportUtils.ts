import type { CircuitComparison, CircuitDifference } from '../types';

// Helper to format circuit data for CSV
function formatCircuitForCSV(circuit: any, type: 'added' | 'removed' | 'modified', differences?: CircuitDifference[]) {
  const base = {
    Type: type,
    Carrier: circuit.carrier,
    'Circuit Type': circuit.type,
    Purpose: circuit.purpose,
    Bandwidth: circuit.bandwidth,
    'Monthly Cost': circuit.monthlycost,
    'Static IPs': circuit.static_ips,
    'Upload Bandwidth': circuit.upload_bandwidth || '',
    'Contract Term': circuit.contract_term,
    Billing: circuit.billing,
    'Usage Charges': circuit.usage_charges ? 'Yes' : 'No',
    'Installation Cost': circuit.installation_cost
  };

  if (type === 'modified' && differences) {
    return {
      ...base,
      Changes: differences.map(d => `${d.field}: ${d.oldValue} → ${d.newValue}`).join('; ')
    };
  }

  return base;
}

// Export as CSV
export function exportDifferencesAsCSV(comparison: CircuitComparison) {
  // Prepare data
  const rows = [
    // Added circuits
    ...comparison.added.map(circuit => 
      formatCircuitForCSV(circuit, 'added')
    ),
    // Removed circuits
    ...comparison.removed.map(circuit => 
      formatCircuitForCSV(circuit, 'removed')
    ),
    // Modified circuits
    ...comparison.modified.map(({ circuit, differences }) => 
      formatCircuitForCSV(circuit, 'modified', differences)
    )
  ];

  // Get all possible headers
  const headers = Array.from(
    new Set(rows.flatMap(row => Object.keys(row)))
  );

  // Convert to CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(header => {
        const value = row[header]?.toString() || '';
        // Escape commas and quotes
        return value.includes(',') || value.includes('"')
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(',')
    )
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `circuit_differences_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export as Excel (XLSX)
export async function exportDifferencesAsExcel(comparison: CircuitComparison) {
  try {
    // Dynamically import xlsx to reduce initial bundle size
    const XLSX = await import('xlsx');
    
    // Prepare data
    const rows = [
      // Added circuits
      ...comparison.added.map(circuit => ({
        ...formatCircuitForCSV(circuit, 'added'),
        _rowColor: '#e6ffe6' // Light green
      })),
      // Removed circuits
      ...comparison.removed.map(circuit => ({
        ...formatCircuitForCSV(circuit, 'removed'),
        _rowColor: '#ffe6e6' // Light red
      })),
      // Modified circuits
      ...comparison.modified.map(({ circuit, differences }) => ({
        ...formatCircuitForCSV(circuit, 'modified', differences),
        _rowColor: '#fff5e6' // Light yellow
      }))
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Add custom styling
    ws['!cols'] = [
      { wch: 10 }, // Type
      { wch: 15 }, // Carrier
      { wch: 15 }, // Circuit Type
      { wch: 12 }, // Purpose
      { wch: 12 }, // Bandwidth
      { wch: 15 }, // Monthly Cost
      { wch: 10 }, // Static IPs
      { wch: 15 }, // Upload Bandwidth
      { wch: 15 }, // Contract Term
      { wch: 10 }, // Billing
      { wch: 12 }, // Usage Charges
      { wch: 15 }, // Installation Cost
      { wch: 50 }  // Changes
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Circuit Differences');

    // Generate and download file
    XLSX.writeFile(wb, `circuit_differences_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
}