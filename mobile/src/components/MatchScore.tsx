import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { MatchScore as Score } from '@/api/types';
import { colors, spacing } from '@/theme';
import { Bar, Muted } from '@/components/ui';

export function scoreColor(n: number) {
  return n >= 85 ? colors.success : n >= 60 ? colors.warning : '#9CA3AF';
}

export function MatchScore({ score, size = 'md', label = 'Match' }: { score: number; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const dim = { sm: 44, md: 64, lg: 92 }[size];
  const font = { sm: 14, md: 20, lg: 30 }[size];
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.ring, { width: dim, height: dim, borderRadius: dim / 2, borderColor: scoreColor(score) }]}>
        <Text style={[styles.value, { fontSize: font }]}>{score}%</Text>
      </View>
      {size !== 'sm' ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const ROWS: { key: keyof Score; label: string; weight: string }[] = [
  { key: 'date', label: 'Date compatibility', weight: '40%' },
  { key: 'price', label: 'Price compatibility', weight: '25%' },
  { key: 'location', label: 'Location', weight: '20%' },
  { key: 'preference', label: 'Housing preferences', weight: '15%' },
];

export function MatchBreakdown({ score }: { score: Score }) {
  return (
    <View>
      {ROWS.map((r) => {
        const v = score[r.key] as number;
        return (
          <View key={r.key} style={{ marginBottom: spacing.md }}>
            <View style={styles.rowHead}>
              <Text style={styles.rowLabel}>{r.label} <Muted>· {r.weight}</Muted></Text>
              <Text style={[styles.rowValue, { color: scoreColor(v) }]}>{v}%</Text>
            </View>
            <Bar pct={v} color={scoreColor(v)} />
          </View>
        );
      })}
      <View style={styles.why}>
        {score.explanation.map((e) => <Text key={e} style={styles.whyLine}>• {e}</Text>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  value: { fontWeight: '800', color: colors.ink },
  label: { fontSize: 12, color: colors.muted, marginTop: 4, fontWeight: '600' },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowLabel: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  rowValue: { fontSize: 14, fontWeight: '800' },
  why: { backgroundColor: colors.bg, borderRadius: 12, padding: spacing.md, marginTop: spacing.xs },
  whyLine: { fontSize: 14, color: colors.ink, lineHeight: 22 },
});
