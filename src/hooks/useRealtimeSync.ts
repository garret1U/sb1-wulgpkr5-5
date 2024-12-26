import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Hook to subscribe to real-time changes for circuits
 */
export function useCircuitRealtimeSync(proposalId: string, locationId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create channels for both active and proposed circuits
    const activeChannel = supabase
      .channel('active-circuits')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'circuits',
          filter: `location_id=eq.${locationId}`
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['circuits', 'active', locationId]
          });
        }
      )
      .subscribe();

    const proposedChannel = supabase
      .channel('proposed-circuits')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposal_circuits',
          filter: `proposal_id=eq.${proposalId}`
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['circuits', 'proposed', proposalId, locationId]
          });
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      activeChannel.unsubscribe();
      proposedChannel.unsubscribe();
    };
  }, [proposalId, locationId, queryClient]);
}