import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Urgency } from '@/api/types';
import { colors, urgencyLabel } from '@/theme';

function Badge({ label, bg, fg = '#fff' }: { label: string; bg: string; fg?: string }) {
  return <View style={[styles.badge, { backgroundColor: bg }]}><Text style={[styles.text, { color: fg }]}>{label}</Text></View>;
}

export const DateMatchBadge = ({ pct }: { pct: number }) => (
  <Badge label={`${pct}% Date Match`} bg={pct >= 90 ? colors.success : pct >= 60 ? colors.warning : '#9CA3AF'} />
);

export const UrgencyBadge = ({ urgency }: { urgency: Urgency }) =>
  urgency === 'normal' ? null : <Badge label={urgencyLabel[urgency]} bg={urgency === 'urgent' ? colors.danger : colors.warning} />;

export const PriceDropBadge = ({ from }: { from?: number | null }) => (
  <Badge label={from ? `PRICE DROP from $${from}` : 'PRICE DROP'} bg={colors.ink} />
);

export const VerifiedBadge = ({ small }: { small?: boolean }) => (
  <View style={[styles.verified, small && { paddingHorizontal: 6, paddingVertical: 2 }]}>
    <Text style={[styles.verifiedText, small && { fontSize: 10 }]}>✓ Verified student</Text>
  </View>
);

export const LikedYouBadge = () => <Badge label="♥ Liked your place" bg={colors.accent} />;

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  verified: { backgroundColor: '#E3F5F7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  verifiedText: { color: colors.seller, fontSize: 12, fontWeight: '700' },
});
