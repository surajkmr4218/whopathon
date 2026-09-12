import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Text } from 'react-native';

import { usePartialFill, useSwipe } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { PartialFillCard } from '@/components/SellerCards';
import { Button, ErrorBox, Loading, Muted, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function PartialFillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = Number(id);
  const q = usePartialFill(listingId);
  const swipe = useSwipe();
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorBox message={(q.error as Error)?.message ?? 'Not found'} onRetry={() => q.refetch()} /></Screen>;
  const { listing, options } = q.data;

  const likeBoth = async (ids: number[]) => {
    let matched = 0;
    for (const renter_id of ids) {
      const res = await swipe.mutateAsync({ listing_id: listingId, renter_id, direction: 'like' });
      if (res.match) matched += 1;
    }
    Alert.alert('Done', matched ? `${matched} of them already liked your place — check Matches!` : "We'll notify you when they like your place back.");
  };

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Better together</Text>
      <Muted style={{ marginBottom: spacing.lg }}>
        Two renters with back-to-back dates can cover more of your {listing.title} vacancy than any single renter. Combinations are computed from real renter date windows.
      </Muted>
      {options.length === 0 ? <EmptyState emoji="🧩" title="No combinations yet" body="We need at least two renters whose dates fit inside your window without overlapping." /> : null}
      {options.map((o, i) => (
        <React.Fragment key={i}>
          <PartialFillCard option={o} listing={listing} />
          <Button title={`Like both ${o.members.map((m) => m.name.split(' ')[0]).join(' & ')}`} variant="seller" style={{ marginBottom: spacing.xl }} loading={swipe.isPending}
            onPress={() => likeBoth(o.members.map((m) => m.renter_id))} />
        </React.Fragment>
      ))}
    </Screen>
  );
}
