import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DealScore } from '@/api/types';
import { Card, Muted, Row } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { money } from '@/utils/dates';

export function dealColor(score: number) {
  return score >= 8 ? colors.success : score >= 6 ? '#5BB450' : score >= 4 ? colors.warning : colors.danger;
}

/** Compact pill for swipe cards. */
export function DealPill({ deal, light }: { deal: DealScore | null; light?: boolean }) {
  if (!deal) return null;
  const c = dealColor(deal.score);
  return (
    <View style={[styles.pill, { backgroundColor: light ? 'rgba(255,255,255,0.92)' : c + '22', borderColor: c }]}>
      <Text style={[styles.pillText, { color: c }]}>{deal.label} · {deal.score}/10</Text>
    </View>
  );
}

/** SeatGeek-style line at the top of a listing: where this price sits vs similar places, and why. */
export function DealBar({ deal }: { deal: DealScore | null }) {
  if (!deal) return null;
  const c = dealColor(deal.score);
  const pct = ((deal.score - 1) / 9) * 100;
  const cheaper = deal.diff_pct >= 0;
  return (
    <Card style={{ borderColor: c, marginTop: spacing.md }}>
      <Row between>
        <Text style={[styles.headline, { color: c }]}>{deal.score >= 6 ? 'This is a good deal' : deal.score >= 4 ? 'This is a fair price' : 'This is above market'}</Text>
        <Text style={[styles.score, { color: c }]}>{deal.score}<Text style={styles.outOf}>/10</Text></Text>
      </Row>
      <View style={styles.track}>
        <View style={[styles.seg, { flex: 3, backgroundColor: colors.danger }]} />
        <View style={[styles.seg, { flex: 2, backgroundColor: colors.warning }]} />
        <View style={[styles.seg, { flex: 2, backgroundColor: '#5BB450' }]} />
        <View style={[styles.seg, { flex: 3, backgroundColor: colors.success }]} />
        <View style={[styles.marker, { left: `${pct}%` }]} />
      </View>
      <Row between style={{ marginTop: 2 }}>
        <Muted>Above market</Muted>
        <Muted>Great deal</Muted>
      </Row>
      <View style={styles.math}>
        <Row between><Text style={styles.line}>Similar {deal.basis}</Text><Text style={styles.value}>{money(deal.market_per_sqft)}/sqft</Text></Row>
        <Row between><Text style={styles.line}>× this place</Text><Text style={styles.value}>{deal.square_feet.toLocaleString()} sqft</Text></Row>
        <Row between><Text style={styles.line}>= market rate</Text><Text style={styles.value}>{money(deal.expected_price)}/mo</Text></Row>
        <View style={styles.divider} />
        <Row between>
          <Text style={[styles.line, { fontWeight: '800' }]}>Asking {money(deal.asking_per_sqft)}/sqft</Text>
          <Text style={[styles.value, { color: c }]}>{Math.abs(deal.diff_pct)}% {cheaper ? 'below' : 'above'} market</Text>
        </Row>
      </View>
      <Muted style={{ marginTop: spacing.sm }}>Based on {deal.comparables} comparable active listings. Rent only, before utilities and fees.</Muted>
    </Card>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1.5, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '800' },
  headline: { fontSize: 18, fontWeight: '800' },
  score: { fontSize: 26, fontWeight: '900' },
  outOf: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  track: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'visible', marginTop: spacing.md, gap: 2 },
  seg: { height: 10, borderRadius: 3 },
  marker: { position: 'absolute', top: -5, width: 20, height: 20, marginLeft: -10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 3, borderColor: colors.ink },
  math: { backgroundColor: colors.bg, borderRadius: 10, padding: spacing.md, marginTop: spacing.md, gap: 6 },
  line: { fontSize: 14, color: colors.ink },
  value: { fontSize: 14, fontWeight: '700', color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
});
