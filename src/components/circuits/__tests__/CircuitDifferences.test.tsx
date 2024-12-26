import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CircuitDifferences } from '../CircuitDifferences';
import { useLocationCircuits } from '../../../hooks/useCircuits';

// Mock the hooks
jest.mock('../../../hooks/useCircuits');

const mockUseLocationCircuits = useLocationCircuits as jest.MockedFunction<typeof useLocationCircuits>;

describe('CircuitDifferences', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state', () => {
    mockUseLocationCircuits.mockReturnValue({
      activeCircuits: [],
      proposedCircuits: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn()
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CircuitDifferences proposalId="123" locationId="456" />
      </QueryClientProvider>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should show error state', () => {
    mockUseLocationCircuits.mockReturnValue({
      activeCircuits: [],
      proposedCircuits: [],
      isLoading: false,
      isError: true,
      error: new Error('Test error'),
      refetch: jest.fn()
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CircuitDifferences proposalId="123" locationId="456" />
      </QueryClientProvider>
    );

    expect(screen.getByText('Error loading circuit data')).toBeInTheDocument();
  });

  it('should show no changes message when circuits are identical', () => {
    mockUseLocationCircuits.mockReturnValue({
      activeCircuits: [],
      proposedCircuits: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn()
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CircuitDifferences proposalId="123" locationId="456" />
      </QueryClientProvider>
    );

    expect(screen.getByText('No changes to review')).toBeInTheDocument();
  });

  it('should display added circuits', async () => {
    const proposedCircuit = {
      id: '1',
      carrier: 'AT&T',
      type: 'MPLS',
      bandwidth: '100 Mbps',
      monthlycost: 1000
    };

    mockUseLocationCircuits.mockReturnValue({
      activeCircuits: [],
      proposedCircuits: [proposedCircuit],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn()
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CircuitDifferences proposalId="123" locationId="456" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Added Circuits')).toBeInTheDocument();
      expect(screen.getByText('AT&T - MPLS')).toBeInTheDocument();
      expect(screen.getByText('100 Mbps - $1,000/mo')).toBeInTheDocument();
    });
  });

  it('should display removed circuits', async () => {
    const activeCircuit = {
      id: '1',
      carrier: 'Verizon',
      type: 'DIA',
      bandwidth: '200 Mbps',
      monthlycost: 2000
    };

    mockUseLocationCircuits.mockReturnValue({
      activeCircuits: [activeCircuit],
      proposedCircuits: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn()
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CircuitDifferences proposalId="123" locationId="456" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Removed Circuits')).toBeInTheDocument();
      expect(screen.getByText('Verizon - DIA')).toBeInTheDocument();
      expect(screen.getByText('200 Mbps - $2,000/mo')).toBeInTheDocument();
    });
  });

  it('should display modified circuits', async () => {
    const activeCircuit = {
      id: '1',
      carrier: 'AT&T',
      type: 'MPLS',
      bandwidth: '100 Mbps',
      monthlycost: 1000
    };

    const proposedCircuit = {
      ...activeCircuit,
      bandwidth: '200 Mbps',
      monthlycost: 1500
    };

    mockUseLocationCircuits.mockReturnValue({
      activeCircuits: [activeCircuit],
      proposedCircuits: [proposedCircuit],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn()
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CircuitDifferences proposalId="123" locationId="456" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Modified Circuits')).toBeInTheDocument();
      expect(screen.getByText('AT&T - MPLS')).toBeInTheDocument();
      expect(screen.getByText('bandwidth: 100 Mbps → 200 Mbps')).toBeInTheDocument();
      expect(screen.getByText('monthlycost: $1,000 → $1,500')).toBeInTheDocument();
    });
  });
});