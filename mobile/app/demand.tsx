import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

import { useDemand } from '@/api/hooks';
import { DemandHeatmap } from '@/components/DemandHeatmap';
import { ErrorBox, Loading, Muted, Screen } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, spacing } from '@/theme';

export default function DemandScreen() {
  const { listingId } = useLocalSearchParams<{ listingId?: string }>();
  const { me } = useAuth();
  const q = useDemand({ listingId: listingId ? Number(listingId) : null, university: listingId ? undefined : me?.user.university });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorBox message={(q.error as Error)?.message ?? 'No data'} onRetry={() => q.refetch()} /></Screen>;
  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Demand near {q.data.university}</Text>
      <Muted style={{ marginBottom: spacing.lg }}>Live from {q.data.total_active} active renter searches. This is the same data that drives your price recommendation.</Muted>
      <DemandHeatmap report={q.data} />
    </Screen>
  );
}
