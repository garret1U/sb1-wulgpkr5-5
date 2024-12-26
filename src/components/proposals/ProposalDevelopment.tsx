import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Network, Plus, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCircuitRealtimeSync } from '../../hooks/useRealtimeSync';
import { usePermissions } from '../../hooks/usePermissions';
import { useNotification } from '../../contexts/NotificationContext';
import { getCircuits, addProposalCircuit, deleteProposalCircuit, getProposal } from '../../lib/api';
import { ProposalStats } from './ProposalStats';
import { ProposalTimeline } from './ProposalTimeline';
import type { Location, Circuit } from '../../types';

interface ProposalDevelopmentProps {
  proposalId: string;
  companyId: string;
  locations: Location[];
}

export function ProposalDevelopment({ 
  proposalId, 
  companyId, 
  locations
}: ProposalDevelopmentProps) {
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const queryClient = useQueryClient();
  const { canModifyCircuits } = usePermissions();
  const { showNotification } = useNotification();

  // Set up real-time sync when a location is expanded
  useCircuitRealtimeSync(proposalId, expandedLocation || '');
  // Get proposal data
  const { data: proposal } = useQuery({
    queryKey: ['proposals', proposalId],
    queryFn: () => getProposal(proposalId),
    staleTime: 0 // Always fetch fresh data
  });

  // Get all circuits for all locations
  const { data: allCircuits } = useQuery({
    queryKey: ['circuits', 'all', locations.map(l => l.id)],
    queryFn: async () => {
      const results = await Promise.all(
        locations.map(location => getCircuits({ location_id: location.id }))
      );
      return results.flat();
    }
  });

  // Get circuits for expanded location
  const { data: locationCircuits } = useQuery({
    queryKey: ['circuits', { location_id: expandedLocation }],
    queryFn: () => getCircuits({ location_id: expandedLocation || undefined }),
    enabled: !!expandedLocation
  });

  // Get available and proposed circuits for each location
  const locationStats = React.useMemo(() => {
    const stats = new Map();
    
    locations.forEach(location => {
      const locationCircuits = allCircuits?.filter(c => c.location_id === location.id) || [];
      const proposedCircuits = proposal?.circuits?.filter(pc => pc.location_id === location.id) || [];
      
      stats.set(location.id, {
        available: locationCircuits.filter(circuit => 
          !proposedCircuits.some(pc => pc.circuit_id === circuit.id)
        ).length,
        proposed: proposedCircuits.length,
        monthlyCost: proposedCircuits.reduce((sum, pc) => sum + pc.circuit.monthlycost, 0)
      });
    });
    
    return stats;
  }, [locations, allCircuits, proposal?.circuits]);

  // Calculate total available circuits
  const totalAvailableCircuits = React.useMemo(() => 
    Array.from(locationStats.values()).reduce((sum, stats) => sum + stats.available, 0),
    [locationStats]
  );

  // Get available circuits for expanded location
  const availableCircuits = locationCircuits?.filter(circuit => 
    !proposal?.circuits?.some(pc => pc.circuit_id === circuit.id)
  );

  // Get proposed circuits for expanded location
  const proposedCircuits = proposal?.circuits?.filter(pc => 
    pc.location_id === expandedLocation
  );

  const { mutate: addCircuit } = useMutation({
    mutationFn: (circuit: Circuit) => addProposalCircuit({
      proposal_id: proposalId,
      circuit_id: circuit.id,
      location_id: circuit.location_id
    }),
    onMutate: async (newCircuit) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['circuits', 'proposed', proposalId] });
      await queryClient.cancelQueries({ queryKey: ['proposals', proposalId] });

      // Snapshot the previous value
      const previousProposal = queryClient.getQueryData(['proposals', proposalId]);

      // Optimistically update the proposal
      queryClient.setQueryData(['proposals', proposalId], (old: any) => ({
        ...old,
        circuits: [...(old?.circuits || []), {
          id: 'temp-' + Date.now(),
          proposal_id: proposalId,
          circuit_id: newCircuit.id,
          location_id: newCircuit.location_id,
          circuit: newCircuit
        }]
      }));

      // Return context object with snapshotted value
      return { previousProposal };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['proposals'],
        exact: false,
        type: 'all',
        refetchType: 'active' // Only refetch active queries
      });
      showNotification({
        type: 'success',
        message: 'Circuit added successfully'
      });
    },
    onError: (err, newCircuit, context) => {
      // Rollback on error
      if (context?.previousProposal) {
        queryClient.setQueryData(['proposals', proposalId], context.previousProposal);
      }
      showNotification({
        type: 'error',
        message: 'Failed to add circuit'
      });
    }
  });

  const { mutate: removeCircuit } = useMutation({
    mutationFn: (circuitId: string) => deleteProposalCircuit(circuitId),
    onMutate: async (circuitId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['circuits', 'proposed', proposalId] });
      await queryClient.cancelQueries({ queryKey: ['proposals', proposalId] });

      // Snapshot the previous value
      const previousProposal = queryClient.getQueryData(['proposals', proposalId]);

      // Optimistically update the proposal
      queryClient.setQueryData(['proposals', proposalId], (old: any) => ({
        ...old,
        circuits: old?.circuits?.filter((c: any) => c.id !== circuitId) || []
      }));

      // Return context object
      return { previousProposal };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['proposals'],
        exact: false,
        type: 'all',
        refetchType: 'active' // Only refetch active queries
      });
      showNotification({
        type: 'success',
        message: 'Circuit removed successfully'
      });
    },
    onError: (err, circuitId, context) => {
      // Rollback on error
      if (context?.previousProposal) {
        queryClient.setQueryData(['proposals', proposalId], context.previousProposal);
      }
      showNotification({
        type: 'error',
        message: 'Failed to remove circuit'
      });
    }
  });

  const handleLocationClick = (locationId: string) => {
    setExpandedLocation(expandedLocation === locationId ? null : locationId);
  };

  const getCriticalityBadge = (criticality: string) => {
    const colors = {
      High: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      Low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
    }[criticality] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`}>
        {criticality}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <ProposalStats 
        circuits={proposal?.circuits || []}
        totalAvailableCircuits={totalAvailableCircuits}
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Proposal Development
        </h2>
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                     ${showTimeline 
                       ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                       : 'text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                     }`}
        >
          {showTimeline ? 'Hide Timeline' : 'Show Timeline'}
        </button>
      </div>


      {showTimeline && proposal && (
        <ProposalTimeline
          proposalId={proposalId}
          locations={locations}
        />
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Plan and propose new circuits for your locations
      </p>

      <div className="space-y-2">
        {locations.map((location) => (
          <div key={location.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
            {/* Location Header */}
            <div
              onClick={() => handleLocationClick(location.id)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center space-x-4">
                {expandedLocation === location.id ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {location.name}
                  </h3>
                  <div className="flex items-center space-x-4 mt-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {location.city}, {location.state}
                    </p>
                    {locationStats.has(location.id) && (
                      <>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Available: {locationStats.get(location.id).available}
                    </p>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Proposed: {locationStats.get(location.id).proposed}
                    </p>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Monthly Cost: ${locationStats.get(location.id).monthlyCost.toLocaleString()}
                    </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {getCriticalityBadge(location.criticality)}
            </div>

            {/* Circuit Options */}
            {expandedLocation === location.id && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Available Circuits */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Available Options
                    </h4>
                    <div className="space-y-3">
                      {availableCircuits?.map(circuit => (
                        <div 
                          key={circuit.id}
                          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 
                                   bg-white dark:bg-gray-800 hover:border-primary"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Network className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                  {circuit.carrier}
                                </h5>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {circuit.type} - {circuit.bandwidth}
                                </p>
                              </div>
                            </div>
                            <button
                              disabled={!canModifyCircuits}
                              onClick={() => addCircuit(circuit)}
                              className={`p-1 rounded-full ${
                                canModifyCircuits
                                  ? 'text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700'
                                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              }`}
                            >
                              <Plus className="h-5 w-5" />
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Monthly Cost</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              ${circuit.monthlycost.toLocaleString()}/mo
                            </span>
                          </div>
                        </div>
                      ))}
                      {(!availableCircuits || availableCircuits.length === 0) && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No circuits available for this location
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Proposed Circuits */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Proposed Circuits
                    </h4>
                    <div className="space-y-3">
                      {proposedCircuits?.map(pc => (
                        <div 
                          key={pc.id}
                          className="p-4 rounded-lg border border-primary bg-primary/5 dark:bg-primary/10"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Network className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                  {pc.circuit.carrier}
                                </h5>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {pc.circuit.type} - {pc.circuit.bandwidth}
                                </p>
                              </div>
                            </div>
                            <button
                              disabled={!canModifyCircuits}
                              onClick={() => removeCircuit(pc.id)}
                              className={`p-1 rounded-full ${
                                canModifyCircuits
                                  ? 'text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              }`}
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Monthly Cost</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              ${pc.circuit.monthlycost.toLocaleString()}/mo
                            </span>
                          </div>
                        </div>
                      ))}
                      {(!proposedCircuits || proposedCircuits.length === 0) && (
                        <div className="p-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            Select circuits from available options to add them to your proposal
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}