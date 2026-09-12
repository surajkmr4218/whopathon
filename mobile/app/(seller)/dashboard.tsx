import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useApplyPrice, useDashboard, useUpdateListing } from '@/api/hooks';
import type { Lever } from '@/api/types';
import { DemandInsightCard, PartialFillCard, RentAtRiskCard, RentRecoveryScore, StatTile, SuggestedPriceCard } from '@/components/SellerCards';
import { Button, ErrorBox, Loading, Muted, Pill, Row, Screen } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, spacing } from '@/theme';
import { money } from '@/utils/dates';

export default function SellerDashboard() {
  const router = useRouter();
  const { me } = useAuth();
  const id = me?.listing_id ?? null;
  const q = useDashboard(id);
  const apply = useApplyPrice(id ?? 0);
  const update = useUpdateListing(id ?? 0);

  if (!id) return <Screen><ErrorBox message="Create a listing first." onRetry={() => router.replace('/onboarding/seller')} /></Screen>;
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorBox message={(q.error as Error)?.message ?? 'No data'} onRetry={() => q.refetch()} /></Screen>;
  const d = q.data;

  const onLever = (l: Lever) => {
    if (l.key === 'price') return apply.mutate(d.pricing.suggested_price, { onSuccess: () => Alert.alert('Price updated', `Renters now see ${money(d.pricing.suggested_price)}/mo with a PRICE DROP badge.`) });
    if (l.key === 'partial') return update.mutate({ accepts_partial: true });
    if (l.key === 'furnished') return update.mutate({ furnished: true });
    if (l.key === 'parking') return update.mutate({ parking: true });
  };

  return (
    <Screen>
      <Text style={styles.h}>Dashboard</Text>
      <Muted style={{ marginBottom: spacing.md }}>{d.listing.title} · {money(d.listing.asking_price)}/mo</Muted>
      <Row style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
        {d.activity.high_demand ? <Pill label="🔥 High demand this week" color={colors.accent} /> : null}
        {d.activity.price_dropped ? <Pill label="Price dropped" color={colors.ink} /> : null}
        {d.activity.new_this_week > 0 ? <Pill label={`${d.activity.new_this_week} new renters match`} color={colors.seller} /> : null}
      </Row>
      <RentAtRiskCard rentAtRisk={d.rent_at_risk} daily={d.daily_loss} vacancyDays={d.vacancy_days} daysToVacancy={d.days_to_vacancy} />
      <Row style={{ marginBottom: spacing.md }}>
        <StatTile label="Potential renters" value={d.compatible_count} color={colors.seller} />
        <StatTile label="Fit & can afford" value={d.affordable_count} />
        <StatTile label="Matches" value={d.mutual_matches} color={colors.success} />
      </Row>
      <Row style={{ marginBottom: spacing.md }}>
        <StatTile label="Students interested" value={d.activity.interested} />
        <StatTile label="Offers pending" value={d.activity.offers_pending} color={d.activity.offers_pending ? colors.warning : undefined} />
      </Row>
      <SuggestedPriceCard pricing={d.pricing} applying={apply.isPending}
        onApply={() => apply.mutate(d.pricing.suggested_price, { onSuccess: () => Alert.alert('Price updated', 'Renter cards now show a PRICE DROP badge.') })}
        onKeep={() => Alert.alert('Kept current price', "We'll keep watching demand and update this recommendation as your vacancy approaches.")} />
      <RentRecoveryScore score={d.recovery.score} levers={d.recovery.levers} onLever={onLever} />
      <DemandInsightCard insights={[...(d.demand.listing_position?.insights ?? []), ...d.demand.insights]} level={d.recovery.demand_level} listingId={id} />
      {d.partial_fill_top ? (
        <View>
          <PartialFillCard option={d.partial_fill_top} listing={d.listing} compact />
          <Button title="See all partial-fill combinations" variant="secondary" onPress={() => router.push(`/partial-fill/${id}`)} style={{ marginBottom: spacing.md }} />
        </View>
      ) : null}
      <Muted style={{ textAlign: 'center' }}>All numbers are computed live from active renter profiles.</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({ h: { fontSize: 28, fontWeight: '800', color: colors.ink } });
