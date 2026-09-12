import React from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/theme';

export function Screen({ children, scroll = true, style, padded = true }: { children: React.ReactNode; scroll?: boolean; style?: ViewStyle; padded?: boolean }) {
  const inner = <View style={[styles.flex, padded && styles.padded, style]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{inner}</ScrollView> : <View style={styles.flex}>{inner}</View>}
    </SafeAreaView>
  );
}

export function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.title}>{children}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'seller' | 'danger';
export function Button({ title, onPress, variant = 'primary', loading, disabled, style, small }: {
  title: string; onPress?: () => void; variant?: Variant; loading?: boolean; disabled?: boolean; style?: ViewStyle; small?: boolean;
}) {
  const bg = { primary: colors.accent, secondary: colors.card, ghost: 'transparent', seller: colors.seller, danger: colors.danger }[variant];
  const fg = variant === 'secondary' ? colors.ink : variant === 'ghost' ? colors.accent : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'secondary' && styles.btnOutline, small && styles.btnSmall, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }, small && { fontSize: 14 }]}>{title}</Text>}
    </Pressable>
  );
}

export function Input({ label, hint, style, ...props }: TextInputProps & { label?: string; hint?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor="#9CA3AF" style={[styles.input, style]} {...props} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, color = colors.accent }: { label: string; selected?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow<T extends string>({ options, value, onChange, color, labels }: {
  options: T[]; value: T; onChange: (v: T) => void; color?: string; labels?: Record<string, string>;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => <Chip key={o} label={labels?.[o] ?? o} selected={value === o} onPress={() => onChange(o)} color={color} />)}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.9 }]}>{children}</Pressable>;
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({ children, style, between }: { children: React.ReactNode; style?: ViewStyle; between?: boolean }) {
  return <View style={[styles.row, between && { justifyContent: 'space-between' }, style]}>{children}</View>;
}

export function Pill({ label, color = colors.accent, soft = true }: { label: string; color?: string; soft?: boolean }) {
  return (
    <View style={[styles.pill, { backgroundColor: soft ? color + '22' : color }]}>
      <Text style={[styles.pillText, { color: soft ? color : '#fff' }]}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value, sub, color = colors.ink }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {sub ? <Text style={styles.hint}>{sub}</Text> : null}
    </View>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.hint, style]}>{children}</Text>;
}

export function Bar({ pct, color = colors.accent, height = 8 }: { pct: number; color?: string; height?: number }) {
  return (
    <View style={[styles.barTrack, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color, height, borderRadius: height / 2 }} />
    </View>
  );
}

export function Loading() {
  return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={[styles.card, { borderColor: colors.danger }]}>
      <Text style={{ color: colors.danger, fontWeight: '600', marginBottom: spacing.sm }}>Something went wrong</Text>
      <Text style={styles.hint}>{message}</Text>
      {onRetry ? <Button title="Retry" variant="secondary" small onPress={onRetry} style={{ marginTop: spacing.md }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: spacing.xxl },
  padded: { padding: spacing.lg, flex: 1 },
  title: { fontSize: 30, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: colors.muted, marginTop: spacing.xs },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  btn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 36 },
  btnOutline: { borderWidth: 1, borderColor: colors.border },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink },
  hint: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '700' },
  statLabel: { fontSize: 12, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  barTrack: { backgroundColor: '#F0EDE8', overflow: 'hidden', width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});
