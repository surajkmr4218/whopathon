import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { Lever, Listing, PartialFillOption, PricingRecommendation } from '@/api/types';
import { Bar, Button, Card, Muted, Pill, Row, SectionTitle, Stat } from '@/components/ui';
import { colors, spacing, urgencyLabel } from '@/theme';
import { fmt, fmtRange, money } from '@/utils/dates';

// ---------- Renter side ----------
export function TrueCostCard({ listing, total }: { listing: Listing; total: number }) {
  const rows: [string, number][] = [['Rent', listing.asking_price], ['Utilities', listing.utilities_cost], ['Parking', listing.parking_cost], ['Required fees', listing.required_fees]];
  return (
    <Card>
      <SectionTitle>True monthly cost</SectionTitle>
      {rows.map(([k, v]) => (
        <Row key={k} between style={{ marginBottom: 6 }}>
          <Text style={styles.line}>{k}</Text>
          <Text style={[styles.line, v === 0 && { color: colors.muted }]}>{v === 0 ? 'Included' : money(v)}</Text>
        </Row>
      ))}
      <View style={styles.divider} />
      <Row between>
        <Text style={styles.total}>Total</Text>
        <Text style={styles.total}>{money(total)}/mo</Text>
      </Row>
    </Card>
  );
}

// ---------- Seller side ----------
export function RentAtRiskCard({ rentAtRisk, daily, vacancyDays, daysToVacancy }: { rentAtRisk: number; daily: number; vacancyDays: number; daysToVacancy: number }) {
  return (
    <Card style={{ backgroundColor: colors.navy, borderColor: colors.navy }}>
      <Row between>
        <Stat label="Rent at risk" value={money(rentAtRisk)} color="#fff" />
        <Stat label="Daily vacancy loss" value={`${money(daily)}/day`} color="#FFB4B6" />
      </Row>
      <Text style={styles.riskNote}>
        Estimate: {vacancyDays} vacancy days × your monthly obligation ÷ 30. {daysToVacancy === 0 ? 'Your place is vacant now.' : `Vacancy starts in ${daysToVacancy} day${daysToVacancy === 1 ? '' : 's'}.`}
      </Text>
    </Card>
  );
}

export function SuggestedPriceCard({ pricing, onApply, applying, onKeep }: { pricing: PricingRecommendation; onApply: () => void; applying?: boolean; onKeep?: () => void }) {
  const p = pricing;
  return (
    <Card style={p.should_reduce ? { borderColor: colors.accent } : undefined}>
      <SectionTitle right={<Pill label={urgencyLabel[p.urgency]} color={p.urgency === 'urgent' ? colors.danger : p.urgency === 'need_filled' ? colors.warning : colors.muted} />}>
        Urgency pricing
      </SectionTitle>
      <Text style={styles.headline}>{p.days_to_vacancy} days until vacancy</Text>
      <Row between style={{ marginTop: spacing.md }}>
        <Stat label="Current" value={`${money(p.current_price)}/mo`} />
        <Stat label="Suggested" value={`${money(p.suggested_price)}/mo`} color={p.should_reduce ? colors.accent : colors.success} />
      </Row>
      <Row between style={{ marginTop: spacing.md }}>
        <Stat label="Current pool" value={`${p.current_pool} renters`} />
        <Stat label="Predicted pool" value={`${p.predicted_pool} renters`} sub={p.should_reduce ? `${p.percent_change >= 0 ? '+' : ''}${p.percent_change}%` : undefined} color={p.should_reduce ? colors.success : colors.ink} />
      </Row>
      <Text style={styles.reason}>{p.explanation}</Text>
      {p.should_reduce ? (
        <Row style={{ marginTop: spacing.md }}>
          <Button title={`Apply ${money(p.suggested_price)}`} onPress={onApply} loading={applying} style={{ flex: 1 }} />
          <Button title="Keep current" variant="secondary" onPress={onKeep} style={{ flex: 1 }} />
        </Row>
      ) : null}
    </Card>
  );
}

export function RentRecoveryScore({ score, levers, onLever }: { score: number; levers: Lever[]; onLever?: (l: Lever) => void }) {
  const color = score >= 75 ? colors.success : score >= 50 ? colors.warning : colors.danger;
  return (
    <Card>
      <SectionTitle>Rent recovery score</SectionTitle>
      <Row style={{ gap: spacing.lg }}>
        <View style={[styles.scoreRing, { borderColor: color }]}><Text style={styles.scoreText}>{score}%</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.line}>How well your listing is positioned to recover the rent you owe.</Text>
          <Muted>Based on compatible renters, affordability, demand, partial-fill options and listing completeness.</Muted>
        </View>
      </Row>
      <SectionTitle>Make my listing work</SectionTitle>
      {levers.map((l) => (
        <Row key={l.key} between style={styles.lever}>
          <View style={{ flex: 1 }}>
            <Text style={styles.line}>{l.label}</Text>
            <Muted>{l.new_count} renters fit & can afford ({l.delta_count >= 0 ? '+' : ''}{l.delta_count})</Muted>
          </View>
          <Text style={[styles.leverScore, { color: l.delta_score > 0 ? colors.success : colors.muted }]}>→ {l.new_score}%</Text>
          {onLever && ['partial', 'price', 'furnished', 'parking'].includes(l.key) ? <Button title="Do it" small variant="secondary" onPress={() => onLever(l)} /> : null}
        </Row>
      ))}
    </Card>
  );
}

export function PartialFillCard({ option, listing, compact }: { option: PartialFillOption; listing: Listing; compact?: boolean }) {
  const palette = [colors.seller, colors.accent, colors.warning];
  const memberColor = (id: number | null) => (id == null ? '#E5E7EB' : palette[option.members.findIndex((m) => m.renter_id === id) % palette.length]);
  return (
    <Card style={{ borderColor: colors.seller }}>
      <SectionTitle right={<Pill label={`${option.coverage_pct}% covered`} color={colors.seller} />}>Better together</SectionTitle>
      <Text style={styles.line}>
        {option.members.map((m) => m.name.split(' ')[0]).join(' + ')} can cover your vacancy back to back.
      </Text>
      <View style={styles.timeline}>
        {option.segments.map((s, i) => (
          <View key={i} style={{ flex: Math.max(s.days, 1), backgroundColor: memberColor(s.renter_id), height: 18, borderRadius: 4 }} />
        ))}
      </View>
      <Row between>
        <Muted>{fmt(listing.available_from)}</Muted>
        <Muted>{fmt(listing.available_until)}</Muted>
      </Row>
      {option.members.map((m, i) => (
        <Row key={m.renter_id} style={{ marginTop: spacing.sm }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: palette[i % palette.length] }} />
          {m.photo_url ? <Image source={{ uri: m.photo_url }} style={styles.miniAvatar} /> : null}
          <Text style={[styles.line, { flex: 1 }]}>{m.name}</Text>
          <Muted>{fmtRange(m.start, m.end)} · {m.days}d · {m.match}%</Muted>
        </Row>
      ))}
      {!compact ? (
        <Row between style={{ marginTop: spacing.md }}>
          <Stat label="Recovered rent" value={money(option.estimated_recovered_rent)} color={colors.success} />
          <Stat label="Uncovered" value={`${option.uncovered_days} days`} />
        </Row>
      ) : null}
    </Card>
  );
}

export function DemandInsightCard({ insights, level, listingId }: { insights: string[]; level: string; listingId: number | null }) {
  const router = useRouter();
  return (
    <Card>
      <SectionTitle right={<Pill label={`${level} demand`} color={level === 'LOW' ? colors.muted : colors.accent} />}>Demand near you</SectionTitle>
      {insights.slice(0, 4).map((i) => <Text key={i} style={styles.insight}>• {i}</Text>)}
      <Button title="See full demand heatmap" variant="secondary" small style={{ marginTop: spacing.md }}
        onPress={() => router.push({ pathname: '/demand', params: listingId ? { listingId: String(listingId) } : {} })} />
    </Card>
  );
}

export function StatTile({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

export function ProgressRow({ label, pct, color }: { label: string; pct: number; color?: string }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Row between style={{ marginBottom: 4 }}>
        <Text style={styles.line}>{label}</Text>
        <Text style={styles.line}>{pct}%</Text>
      </Row>
      <Bar pct={pct} color={color ?? colors.seller} />
    </View>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: 15, color: colors.ink },
  total: { fontSize: 17, fontWeight: '800', color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  riskNote: { color: '#C7CEDB', fontSize: 13, marginTop: spacing.md, lineHeight: 18 },
  headline: { fontSize: 20, fontWeight: '800', color: colors.ink },
  reason: { fontSize: 14, color: colors.ink, lineHeight: 20, marginTop: spacing.md, backgroundColor: colors.bg, padding: spacing.md, borderRadius: 10 },
  scoreRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 24, fontWeight: '800', color: colors.ink },
  lever: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  leverScore: { fontSize: 15, fontWeight: '800' },
  timeline: { flexDirection: 'row', gap: 2, marginVertical: spacing.md },
  miniAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.bg },
  insight: { fontSize: 14, color: colors.ink, lineHeight: 22 },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  tileValue: { fontSize: 22, fontWeight: '800', color: colors.ink },
  tileLabel: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: '600' },
});
