import { renderHook } from '@testing-library/react-hooks';
import { useCircuitRealtimeSync } from '../useRealtimeSync';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

// Mock dependencies
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn()
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn()
    }))
  }
}));

describe('useCircuitRealtimeSync', () => {
  const mockQueryClient = {
    invalidateQueries: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
  });

  it('should set up subscriptions for active and proposed circuits', () => {
    const proposalId = 'proposal-123';
    const locationId = 'location-456';

    renderHook(() => useCircuitRealtimeSync(proposalId, locationId));

    // Verify channel creation
    expect(supabase.channel).toHaveBeenCalledTimes(2);
    expect(supabase.channel).toHaveBeenCalledWith('active-circuits');
    expect(supabase.channel).toHaveBeenCalledWith('proposed-circuits');
  });

  it('should clean up subscriptions on unmount', () => {
    const proposalId = 'proposal-123';
    const locationId = 'location-456';

    const { unmount } = renderHook(() => 
      useCircuitRealtimeSync(proposalId, locationId)
    );

    const mockChannel = supabase.channel();
    unmount();

    expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('should invalidate queries when changes occur', () => {
    const proposalId = 'proposal-123';
    const locationId = 'location-456';

    renderHook(() => useCircuitRealtimeSync(proposalId, locationId));

    // Simulate a change event
    const onCallback = supabase.channel().on.mock.calls[0][2];
    onCallback();

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['circuits', 'active', locationId]
    });
  });
});