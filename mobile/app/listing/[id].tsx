import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Dimensions, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useListing, useSwipe } from '@/api/hooks';
import { DateMatchBadge, PriceDropBadge, UrgencyBadge, VerifiedBadge } from '@/components/Badges';
import { MatchBreakdown, MatchScore } from '@/components/MatchScore';
import { TrueCostCard } from '@/components/SellerCards';
import { Button, Card, ErrorBox, Loading, Muted, Row, Screen, SectionTitle } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, flexibilityLabel, spacing } from '@/theme';
import { daysBetween, fmtRange, money } from '@/utils/dates';

const W = Dimensions.get('window').width;

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { me } = useAuth();
  const q = useListing(Number(id));
  const swipe = useSwipe();

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorBox message={(q.error as Error)?.message ?? 'Not found'} onRetry={() => q.refetch()} /></Screen>;
  const { listing: l, photos, score, seller, badges } = q.data;
  const canSwipe = me?.user.mode === 'renter' && l.seller_id !== me.user.id && !!score;

  const act = (direction: 'like' | 'pass', prefill?: string) => swipe.mutate({ listing_id: l.id, direction }, {
    onSuccess: (res) => {
      if (res.match) router.replace({ pathname: `/match/${res.match.match.id}`, params: prefill ? { prefill } : {} });
      else if (direction === 'like') { Alert.alert('Interest sent', `We'll let you know if ${seller.name.split(' ')[0]} likes you back.`); router.back(); }
      else router.back();
    },
    onError: (e) => Alert.alert('Oops', (e as Error).message),
  });

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {photos.map((p) => <Image key={p} source={{ uri: p }} style={{ width: W, height: 280 }} />)}
        </ScrollView>
        <View style={{ padding: spacing.lg }}>
          <Row style={{ flexWrap: 'wrap', marginBottom: spacing.sm }}>
            {badges.price_drop ? <PriceDropBadge from={badges.previous_price} /> : null}
            <UrgencyBadge urgency={l.urgency} />
          </Row>
          <Row between>
            <View style={{ flex: 1 }}>
              <Text style={styles.price}>{money(l.asking_price)}<Text style={styles.per}>/mo</Text></Text>
              <Text style={styles.title}>{l.title}</Text>
              <Muted>{l.address}, {l.city} · {l.distance_miles} mi from {l.university}</Muted>
            </View>
            {score ? <MatchScore score={score.overall} size="lg" /> : null}
          </Row>
          {l.description ? <Text style={styles.desc}>{l.description}</Text> : null}

          <Card style={{ marginTop: spacing.lg }}>
            <SectionTitle right={score ? <DateMatchBadge pct={score.date} /> : undefined}>Available dates</SectionTitle>
            <Text style={styles.big}>{fmtRange(l.available_from, l.available_until)}</Text>
            <Muted>{daysBetween(l.available_from, l.available_until)} days</Muted>
            {score && score.date_gap_days > 0 ? (
              <View style={styles.gap}>
                <Text style={styles.gapText}>{score.date_gap_days}-day gap vs your dates ≈ {money(score.gap_value_usd)} for the seller.</Text>
                <Button title="Ask about flexible dates" small variant="secondary" style={{ marginTop: spacing.sm }}
                  onPress={() => act('like', `Hi ${seller.name.split(' ')[0]}! My dates are off by about ${score.date_gap_days} days — any flexibility on move-in/move-out?`)} />
              </View>
            ) : null}
          </Card>

          {score ? (
            <Card>
              <SectionTitle>Why this match</SectionTitle>
              <MatchBreakdown score={score} />
            </Card>
          ) : null}

          <TrueCostCard listing={l} total={q.data.true_monthly_cost} />

          <Card>
            <SectionTitle>The place</SectionTitle>
            <Muted>{l.housing_type} · {l.bedrooms} bd · {l.bathrooms} ba · {l.furnished ? 'Furnished' : 'Unfurnished'} · {l.parking ? 'Parking' : 'No parking'} · {l.roommates ? `${l.roommates} roommate${l.roommates > 1 ? 's' : ''}` : 'No roommates'}</Muted>
            <Row style={{ flexWrap: 'wrap', marginTop: spacing.sm }}>
              {l.amenities.map((a) => <View key={a} style={styles.chip}><Text style={styles.chipText}>{a}</Text></View>)}
            </Row>
          </Card>

          <Card>
            <Row style={{ gap: spacing.md }}>
              <Image source={{ uri: seller.photo_url ?? undefined }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sellerName}>{seller.name}</Text>
                <Muted>{seller.university}</Muted>
                {seller.verified ? <View style={{ marginTop: 4 }}><VerifiedBadge small /></View> : null}
              </View>
            </Row>
          </Card>
          <Muted style={{ textAlign: 'center' }}>SubSwipe helps you discover and negotiate. Lease permissions are between you and the seller.</Muted>
        </View>
      </ScrollView>
      {canSwipe ? (
        <View style={styles.footer}>
          <Button title="Pass" variant="secondary" style={{ flex: 1 }} onPress={() => act('pass')} />
          <Button title="Interested ♥" style={{ flex: 2 }} onPress={() => act('like')} loading={swipe.isPending} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: { fontSize: 30, fontWeight: '800', color: colors.ink },
  per: { fontSize: 16, color: colors.muted, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink, marginTop: 2 },
  desc: { fontSize: 15, color: colors.ink, lineHeight: 22, marginTop: spacing.md },
  big: { fontSize: 18, fontWeight: '800', color: colors.ink },
  gap: { backgroundColor: colors.warningSoft, borderRadius: 10, padding: spacing.md, marginTop: spacing.md },
  gapText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  chip: { backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipText: { fontSize: 12, color: colors.ink, fontWeight: '600' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bg },
  sellerName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
