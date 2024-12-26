import { useQuery } from '@tanstack/react-query';
import { getActiveCircuits, getProposedCircuits } from '../lib/api';
import type { Circuit } from '../types';

export function useActiveCircuits(locationId: string) {
  return useQuery<Circuit[]>({
    queryKey: ['circuits', 'active', locationId],
    queryFn: () => getActiveCircuits(locationId), 
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
    enabled: !!locationId // Only run query if locationId is provided
  });
}

export function useProposedCircuits(proposalId: string, locationId: string) {
  return useQuery<Circuit[]>({
    queryKey: ['circuits', 'proposed', proposalId, locationId],
    queryFn: () => getProposedCircuits(proposalId, locationId), 
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
    enabled: !!proposalId && !!locationId // Only run query if both IDs are provided
  });
}

// Helper hook to get both active and proposed circuits
export function useLocationCircuits(proposalId: string, locationId: string) {
  const activeCircuits = useActiveCircuits(locationId);
  const proposedCircuits = useProposedCircuits(proposalId, locationId);

  return {
    activeCircuits: activeCircuits.data || [],
    proposedCircuits: proposedCircuits.data || [],
    isLoading: activeCircuits.isLoading || proposedCircuits.isLoading,
    isError: activeCircuits.isError || proposedCircuits.isError,
    error: activeCircuits.error || proposedCircuits.error,
    refetch: () => {
      activeCircuits.refetch();
      proposedCircuits.refetch();
    }
  };
}