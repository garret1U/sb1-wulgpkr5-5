import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getActiveCircuits, getProposedCircuits } from '../../lib/api';
import type { Circuit } from '../../types';
import type { Location } from '../../types';

interface ProposalTimelineProps {
  proposalId: string;
  locations: Location[];
}

interface MonthData {
  month: string;
  existingMpls: number;
  existingDia: number;
  existingBroadband: number;
  existingLte: number;
  proposedMpls: number;
  proposedDia: number;
  proposedBroadband: number;
  proposedLte: number;
}

function generateMonthLabels(startDate: Date): string[] {
  const months = [];
  for (let i = 0; i < 36; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    // Only show year for January
    months.push(date.getMonth() === 0 ? date.getFullYear().toString() : '');
  }
  return months;
}

function isCircuitActive(circuit: Circuit, monthDate: Date): boolean {
  if (!circuit.contract_start_date) return false;
  
  const startDate = new Date(circuit.contract_start_date);
  const endDate = circuit.contract_end_date ? new Date(circuit.contract_end_date) : null;

  if (!endDate) {
    // If no end date, assume active from start date onwards
    return startDate <= monthDate;
  }

  return startDate <= monthDate && monthDate <= endDate;
}

export function ProposalTimeline({ proposalId, locations }: ProposalTimelineProps) {
  // Get active circuits for each location
  const activeCircuitsQueries = useQuery({
    queryKey: ['circuits', 'active', locations.map(l => l.id)],
    queryFn: async () => {
      if (!locations.length) return [];
      const results = await Promise.all(
        locations.map(location => getActiveCircuits(location.id))
      );
      return results.flat();
    },
    enabled: locations.length > 0
  });

  // Get proposed circuits for each location
  const proposedCircuitsQueries = useQuery({
    queryKey: ['circuits', 'proposed', proposalId, locations.map(l => l.id)],
    queryFn: async () => {
      if (!locations.length) return [];
      const results = await Promise.all(
        locations.map(location => getProposedCircuits(proposalId, location.id))
      );
      return results.flat();
    },
    enabled: locations.length > 0
  });

  const data = useMemo(() => {
    if (!activeCircuitsQueries.data || !proposedCircuitsQueries.data) return [];

    const startDate = new Date();
    const months = generateMonthLabels(startDate);
    
    return months.map((month, index) => {
      const monthDate = new Date(startDate);
      monthDate.setMonth(monthDate.getMonth() + index);

      // Initialize data structure
      const monthData: MonthData = {
        month,
        existingMpls: 0,
        existingDia: 0,
        existingBroadband: 0,
        existingLte: 0,
        proposedMpls: 0,
        proposedDia: 0,
        proposedBroadband: 0,
        proposedLte: 0
      };

      // Calculate active circuit costs
      activeCircuitsQueries.data.forEach(circuit => {
        if (isCircuitActive(circuit, monthDate)) {
          const key = `existing${circuit.type.replace(/[^a-zA-Z]/g, '')}` as keyof MonthData;
          if (key in monthData) {
            monthData[key] += circuit.monthlycost;
          }
        }
      });

      // Calculate proposed circuit costs
      proposedCircuitsQueries.data.forEach(circuit => {
        if (isCircuitActive(circuit, monthDate)) {
          const key = `proposed${circuit.type.replace(/[^a-zA-Z]/g, '')}` as keyof MonthData;
          if (key in monthData) {
            monthData[key] += circuit.monthlycost;
          }
        }
      });

      return monthData;
    });
  }, [activeCircuitsQueries.data, proposedCircuitsQueries.data]);

  if (activeCircuitsQueries.isLoading || proposedCircuitsQueries.isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
        Timeline of Monthly Circuit Costs (36 months)
      </h2>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
              interval={0}
            />
            <YAxis 
              tick={{ fill: '#6B7280' }}
              axisLine={{ stroke: '#374151' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip 
              formatter={(value: number) => `$${value.toLocaleString()}`}
              labelFormatter={(label: string, payload: any) => {
                if (!payload?.[0]?.payload) return '';
                const date = new Date();
                date.setMonth(date.getMonth() + payload[0].payload.index);
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              }}
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.375rem'
              }}
              labelStyle={{ color: '#9CA3AF' }}
              itemStyle={{ color: '#E5E7EB' }}
            />
            <Legend 
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: '20px' }}
            />
            {/* Existing Circuits */}
            <Bar dataKey="existingMpls" name="MPLS" stackId="existing" fill="#7E22CE" />
            <Bar dataKey="existingDia" name="DIA" stackId="existing" fill="#9333EA" />
            <Bar dataKey="existingBroadband" name="Broadband" stackId="existing" fill="#A855F7" />
            <Bar dataKey="existingLte" name="LTE" stackId="existing" fill="#C084FC" />
            {/* Proposed Circuits */}
            <Bar dataKey="proposedMpls" name="MPLS (Proposed)" stackId="proposed" fill="#1D4ED8" />
            <Bar dataKey="proposedDia" name="DIA (Proposed)" stackId="proposed" fill="#2563EB" />
            <Bar dataKey="proposedBroadband" name="Broadband (Proposed)" stackId="proposed" fill="#3B82F6" />
            <Bar dataKey="proposedLte" name="LTE (Proposed)" stackId="proposed" fill="#60A5FA" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}