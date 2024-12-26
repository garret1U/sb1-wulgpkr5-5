import { useQuery } from '@tanstack/react-query';
import { getCurrentUserProfile } from '../lib/api';

export function usePermissions() {
  const { data: profile } = useQuery({
    queryKey: ['currentProfile'],
    queryFn: getCurrentUserProfile
  });

  return {
    isAdmin: profile?.role === 'admin',
    canModifyCircuits: profile?.role === 'admin',
    canViewCircuits: true, // All authenticated users can view
    isLoading: !profile,
    profile
  };
}