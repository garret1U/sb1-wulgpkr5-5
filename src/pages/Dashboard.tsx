import React, { useState } from 'react';
import { Activity, CircleDollarSign, Network, AlertCircle, X, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DashboardCard } from '../components/ui/DashboardCard';
import { FilterDropdown } from '../components/ui/FilterDropdown';
import { CircuitDifferences } from '../components/circuits/CircuitDifferences';
import { getDashboardStats, getCompanies, getLocations, getProposals } from '../lib/api';

export function Dashboard() {
  const [companyFilter, setCompanyFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);

  const hasFilters = companyFilter || locationFilter;

  const clearFilters = () => {
    setCompanyFilter('');
    setLocationFilter('');
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats', { company_id: companyFilter, location_id: locationFilter }],
    queryFn: () => getDashboardStats({ 
      company_id: companyFilter, 
      location_id: locationFilter 
    })
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: getCompanies
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations
  });

  const { data: proposals } = useQuery({
    queryKey: ['proposals', companyFilter],
    queryFn: () => getProposals(companyFilter)
  });

  const companyOptions = React.useMemo(() => {
    return (companies || []).map(company => ({
      value: company.id,
      label: company.name
    }));
  }, [companies]);

  const locationOptions = React.useMemo(() => {
    return (locations || [])
      .filter(location => !companyFilter || location.company_id === companyFilter)
      .map(location => ({
        value: location.id,
        label: `${location.name} (${location.company?.name})`
      }));
  }, [locations, companyFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-4 flex items-center space-x-1 px-2 py-1 text-sm text-gray-500 
                       hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                       bg-gray-100 dark:bg-gray-700 rounded-md"
            >
              <X className="h-4 w-4" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
        <div className="flex space-x-4">
          <FilterDropdown
            value={companyFilter}
            onChange={(value) => {
              setCompanyFilter(value);
              setLocationFilter('');
              setSelectedProposal(null);
            }}
            options={companyOptions}
            label="All Companies"
          />
          <FilterDropdown
            value={locationFilter}
            onChange={setLocationFilter}
            options={locationOptions}
            label="All Locations"
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Total Circuits"
            value={stats?.totalCircuits || 0}
            icon={<Network className="h-6 w-6" />}
          />
          <DashboardCard
            title="Active Circuits"
            value={stats?.activeCircuits || 0}
            icon={<Activity className="h-6 w-6" />}
          />
          <DashboardCard
            title="Inactive Circuits"
            value={stats?.inactiveCircuits || 0}
            icon={<AlertCircle className="h-6 w-6" />}
          />
          <DashboardCard
            title="Monthly Cost"
            value={`$${(stats?.totalMonthlyCost || 0).toLocaleString()}`}
            icon={<CircleDollarSign className="h-6 w-6" />}
          />
        </div>
      )}

      {/* Proposals Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Active Proposals
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proposals?.map(proposal => (
            <div
              key={proposal.id}
              onClick={() => setSelectedProposal(selectedProposal === proposal.id ? null : proposal.id)}
              className={`
                p-4 rounded-lg border cursor-pointer transition-all
                ${selectedProposal === proposal.id 
                  ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary'}
              `}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {proposal.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {proposal.company?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${proposal.status === 'Draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' :
                    proposal.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
                    proposal.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'}
                `}>
                  {proposal.status}
                </span>
                {proposal.valid_until && (
                  <span className="text-gray-500 dark:text-gray-400">
                    Valid until {new Date(proposal.valid_until).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
          {(!proposals || proposals.length === 0) && (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              No active proposals found
            </div>
          )}
        </div>
      </div>

      {/* Circuit Differences */}
      {selectedProposal && locationFilter && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Circuit Differences
          </h2>
          <CircuitDifferences
            proposalId={selectedProposal}
            locationId={locationFilter}
          />
        </div>
      )}
    </div>
  );
}