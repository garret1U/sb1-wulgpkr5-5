export interface CircuitFilter {
  type: 'all' | 'added' | 'removed' | 'modified';
  carrier?: string;
  criticality?: string;
  search?: string;
}

export type SortField = 'carrier' | 'type' | 'bandwidth' | 'monthlycost';
export type SortDirection = 'asc' | 'desc';

export interface CircuitSort {
  field: SortField;
  direction: SortDirection;
}