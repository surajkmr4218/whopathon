import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RatingSummary } from '@/api/types';
import { colors } from '@/theme';

/** Compact "★ 4.8 (12)" summary used on swipe cards and profiles. */
export function Stars({ rating, size = 13, label, light }: { rating: RatingSummary | undefined; size?: number; label?: string; light?: boolean }) {
  if (!rating) return null;
  const fg = light ? '#fff' : colors.ink;
  if (!rating.count) return <Text style={[styles.text, { fontSize: size, color: light ? '#E5E7EB' : colors.muted }]}>☆ New{label ? ` ${label}` : ''}</Text>;
  return (
    <View style={styles.row}>
      <Text style={[styles.star, { fontSize: size }]}>★</Text>
      <Text style={[styles.text, { fontSize: size, color: fg }]}>{rating.avg?.toFixed(1)}</Text>
      <Text style={[styles.text, { fontSize: size - 1, color: light ? '#E5E7EB' : colors.muted }]}>({rating.count}){label ? ` ${label}` : ''}</Text>
    </View>
  );
}

/** Five big tappable stars for leaving a rating. */
export function StarPicker({ value, onChange, size = 40 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <View style={[styles.row, { gap: 8, justifyContent: 'center' }]}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
          <Text style={{ fontSize: size, color: n <= value ? '#F5A524' : '#D1D5DB' }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function StarRow({ stars, size = 14 }: { stars: number; size?: number }) {
  return <Text style={{ fontSize: size, color: '#F5A524', letterSpacing: 1 }}>{'★'.repeat(stars)}<Text style={{ color: '#D1D5DB' }}>{'★'.repeat(5 - stars)}</Text></Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  star: { color: '#F5A524' },
  text: { fontWeight: '700' },
});
