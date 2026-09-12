import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { ListingCardData } from '@/api/types';
import { DateMatchBadge, PriceDropBadge, UrgencyBadge, VerifiedBadge, WantsYouBadge } from '@/components/Badges';
import { DealPill } from '@/components/DealBar';
import { MatchScore } from '@/components/MatchScore';
import { Stars } from '@/components/Stars';
import { colors, radius, spacing } from '@/theme';
import { fmtRange, money } from '@/utils/dates';

export function ListingCard({ card }: { card: ListingCardData }) {
  const { listing: l, photos, score, badges, seller } = card;
  const specs = [`${l.bedrooms} bd · ${l.bathrooms} ba`, l.furnished ? 'Furnished' : 'Unfurnished', l.parking ? 'Parking' : null, l.roommates ? `${l.roommates} roommate${l.roommates > 1 ? 's' : ''}` : 'No roommates'].filter(Boolean);
  return (
    <View style={styles.card}>
      <View style={styles.photoWrap}>
        <Image source={{ uri: photos[0] }} style={styles.photo} />
        <View style={styles.badges}>
          {card.seller_liked_you ? <WantsYouBadge /> : null}
          {badges.price_drop ? <PriceDropBadge from={badges.previous_price} /> : null}
          <UrgencyBadge urgency={badges.urgency} />
        </View>
        <View style={styles.dealCorner}><DealPill deal={card.deal} light /></View>
        <View style={styles.photoFooter}>
          <View style={{ flex: 1 }}>
            <Text style={styles.price}>{money(l.asking_price)}<Text style={styles.per}>/mo</Text></Text>
            <Text style={styles.title} numberOfLines={1}>{l.title}</Text>
            <Text style={styles.addr}>{l.distance_miles} mi from {l.university} · {l.city}</Text>
            <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.addr}>{seller.name.split(' ')[0]}</Text>
              <Stars rating={seller.rating} light size={12} label="seller" />
            </View>
          </View>
          {score ? <MatchScore score={score.overall} size="md" /> : null}
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.rowBetween}>
          {score ? <DateMatchBadge pct={score.date} /> : null}
          <Text style={styles.dates}>{fmtRange(l.available_from, l.available_until)}</Text>
        </View>
        <View style={styles.chips}>
          {specs.map((s) => <View key={s as string} style={styles.chip}><Text style={styles.chipText}>{s}</Text></View>)}
          {l.amenities.slice(0, 3).map((a) => <View key={a} style={styles.chip}><Text style={styles.chipText}>{a}</Text></View>)}
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.trueCost}>True cost {money(card.true_monthly_cost)}/mo</Text>
          {badges.verified ? <VerifiedBadge small /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  photoWrap: { flex: 1, backgroundColor: '#E5E7EB' },
  photo: { width: '100%', height: '100%' },
  badges: { position: 'absolute', top: 14, left: 14, gap: 6 },
  dealCorner: { position: 'absolute', top: 14, right: 14 },
  photoFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, backgroundColor: 'rgba(20,27,45,0.72)' },
  price: { color: '#fff', fontSize: 28, fontWeight: '800' },
  per: { fontSize: 16, fontWeight: '600', color: '#E5E7EB' },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 2 },
  addr: { color: '#D1D5DB', fontSize: 13, marginTop: 2 },
  body: { padding: spacing.lg, gap: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dates: { fontSize: 14, fontWeight: '700', color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipText: { fontSize: 12, color: colors.ink, fontWeight: '600' },
  trueCost: { fontSize: 13, color: colors.muted, fontWeight: '600' },
});
