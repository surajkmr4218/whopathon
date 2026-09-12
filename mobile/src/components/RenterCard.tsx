import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { RenterCardData } from '@/api/types';
import { DateMatchBadge, LikedYouBadge, VerifiedBadge } from '@/components/Badges';
import { MatchScore } from '@/components/MatchScore';
import { Stars } from '@/components/Stars';
import { colors, flexibilityLabel, radius, spacing } from '@/theme';
import { daysBetween, fmtRange, money } from '@/utils/dates';

export function RenterCard({ card }: { card: RenterCardData }) {
  const { renter, profile: p, score } = card;
  const prefs = [
    p.furnished_pref !== 'none' ? `Furnished ${p.furnished_pref}` : null,
    p.parking_pref !== 'none' ? `Parking ${p.parking_pref}` : null,
    p.housing_type !== 'any' ? p.housing_type : 'Any housing',
    p.roommates_ok ? 'Roommates OK' : 'No roommates',
    `≤ ${p.max_distance_miles} mi`,
  ].filter(Boolean) as string[];
  return (
    <View style={styles.card}>
      <View style={styles.hero}>
        <Image source={{ uri: renter.photo_url ?? undefined }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{renter.name}</Text>
          <Text style={styles.uni}>{renter.university} · {p.city}</Text>
          <View style={{ marginTop: 2 }}><Stars rating={renter.rating} label="as renter" /></View>
          <View style={{ marginTop: 6, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {renter.verified ? <VerifiedBadge small /> : null}
            {card.already_liked_you ? <LikedYouBadge /> : null}
          </View>
        </View>
        <MatchScore score={score.overall} size="md" />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Wants</Text>
        <Text style={styles.big}>{fmtRange(p.move_in, p.move_out)}</Text>
        <Text style={styles.sub}>{daysBetween(p.move_in, p.move_out)} days · {flexibilityLabel[p.flexibility]}</Text>
        <View style={{ marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <DateMatchBadge pct={score.date} />
          <Text style={styles.sub}>Covers {score.listing_coverage}% of your vacancy</Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Budget</Text>
        <Text style={styles.big}>Up to {money(p.max_budget)}/mo</Text>
      </View>
      <View style={styles.chips}>
        {prefs.map((s) => <View key={s} style={styles.chip}><Text style={styles.chipText}>{s}</Text></View>)}
      </View>
      <View style={styles.why}>
        {score.explanation.slice(0, 3).map((e) => <Text key={e} style={styles.whyLine}>• {e}</Text>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6, gap: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.sellerSoft },
  name: { fontSize: 22, fontWeight: '800', color: colors.ink },
  uni: { fontSize: 14, color: colors.muted, marginTop: 2 },
  section: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.md },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  big: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 2 },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.sellerSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipText: { fontSize: 12, color: colors.seller, fontWeight: '700' },
  why: { marginTop: 'auto' },
  whyLine: { fontSize: 14, color: colors.ink, lineHeight: 22 },
});
