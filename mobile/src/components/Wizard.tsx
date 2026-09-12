import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Row } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { addDays, todayISO } from '@/utils/dates';

export function Steps({ step, total, color = colors.accent }: { step: number; total: number; color?: string }) {
  return (
    <Row style={{ marginBottom: spacing.lg }}>
      {Array.from({ length: total }).map((_, i) => <View key={i} style={[styles.dot, i <= step && { backgroundColor: color, width: 22 }]} />)}
    </Row>
  );
}

export function StepNav({ step, total, onBack, onNext, nextLabel, busy, disabled, color }: {
  step: number; total: number; onBack: () => void; onNext: () => void; nextLabel?: string; busy?: boolean; disabled?: boolean; color?: 'primary' | 'seller';
}) {
  return (
    <Row style={{ marginTop: spacing.lg }}>
      {step > 0 ? <Button title="Back" variant="secondary" onPress={onBack} style={{ flex: 1 }} /> : null}
      <Button title={nextLabel ?? (step === total - 1 ? 'Finish' : 'Next')} onPress={onNext} loading={busy} disabled={disabled} variant={color ?? 'primary'} style={{ flex: 2 }} />
    </Row>
  );
}

export function StepTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.h}>{children}</Text>
      {sub ? <Text style={styles.p}>{sub}</Text> : null}
    </View>
  );
}

export const Label = ({ children }: { children: React.ReactNode }) => <Text style={styles.label}>{children}</Text>;

/** Quick date presets relative to today so seeded demo data and new entries line up. */
export const DATE_PRESETS: { label: string; from: string; until: string }[] = [
  { label: 'Next 3 months', from: addDays(todayISO(), 14), until: addDays(todayISO(), 104) },
  { label: 'Summer-style (12 wks)', from: addDays(todayISO(), 20), until: addDays(todayISO(), 104) },
  { label: '6 weeks', from: addDays(todayISO(), 10), until: addDays(todayISO(), 52) },
];

const styles = StyleSheet.create({
  dot: { height: 6, width: 10, borderRadius: 3, backgroundColor: colors.border },
  h: { fontSize: 24, fontWeight: '800', color: colors.ink },
  p: { fontSize: 14, color: colors.muted, marginTop: 4, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6, marginTop: 4 },
});
