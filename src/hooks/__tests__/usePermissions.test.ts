import { renderHook } from '@testing-library/react-hooks';
import { usePermissions } from '../usePermissions';
import { getCurrentUserProfile } from '../../lib/api';

// Mock dependencies
jest.mock('../../lib/api');

describe('usePermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should identify admin users', async () => {
    (getCurrentUserProfile as jest.Mock).mockResolvedValue({
      role: 'admin'
    });

    const { result, waitForNextUpdate } = renderHook(() => usePermissions());
    
    await waitForNextUpdate();

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canModifyCircuits).toBe(true);
  });

  it('should restrict viewer permissions', async () => {
    (getCurrentUserProfile as jest.Mock).mockResolvedValue({
      role: 'viewer'
    });

    const { result, waitForNextUpdate } = renderHook(() => usePermissions());
    
    await waitForNextUpdate();

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.canModifyCircuits).toBe(false);
    expect(result.current.canViewCircuits).toBe(true);
  });

  it('should handle loading state', () => {
    (getCurrentUserProfile as jest.Mock).mockImplementation(() => 
      new Promise(() => {})
    );

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isLoading).toBe(true);
  });
});