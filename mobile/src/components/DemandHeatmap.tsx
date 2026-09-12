import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Bucket, DemandReport } from '@/api/types';
import { ProgressRow } from '@/components/SellerCards';
import { Card, Muted, Pill, Row, SectionTitle } from '@/components/ui';
import { colors, levelColor, spacing } from '@/theme';

function Bars({ buckets, highlight }: { buckets: Bucket[]; highlight?: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <View style={styles.bars}>
      {buckets.map((b) => (
        <View key={b.key} style={styles.barCol}>
          <Text style={styles.count}>{b.count}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { height: `${Math.max(6, (b.count / max) * 100)}%`, backgroundColor: levelColor[b.level] }]} />
          </View>
          <Text style={[styles.barLabel, b.label === highlight && styles.hl]} numberOfLines={2}>{b.label.replace(' 20', ' ’')}</Text>
          {b.label === highlight ? <Text style={styles.you}>you</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function DemandHeatmap({ report }: { report: DemandReport }) {
  const pos = report.listing_position;
  return (
    <View>
      <Card>
        <SectionTitle right={<Pill label={`${report.total_active} active renters`} color={colors.seller} />}>When renters need housing</SectionTitle>
        <Bars buckets={report.by_month} />
        <Row style={{ marginTop: spacing.sm, flexWrap: 'wrap' }}>
          {(['VERY HIGH', 'HIGH', 'MEDIUM', 'LOW'] as const).map((l) => (
            <Row key={l} style={{ gap: 4 }}><View style={[styles.dot, { backgroundColor: levelColor[l] }]} /><Muted>{l}</Muted></Row>
          ))}
        </Row>
      </Card>
      <Card>
        <SectionTitle right={<Muted>median {`$${report.median_budget}`}</Muted>}>Budgets</SectionTitle>
        <Bars buckets={report.budget_buckets} highlight={pos?.price_bucket} />
        {pos ? (
          <View style={styles.position}>
            {pos.insights.map((i) => <Text key={i} style={styles.insight}>• {i}</Text>)}
          </View>
        ) : null}
      </Card>
      <Card>
        <SectionTitle>What renters want</SectionTitle>
        <ProgressRow label="Furnished" pct={report.furnished_pct} />
        <ProgressRow label="Parking" pct={report.parking_pct} />
        <ProgressRow label="Within 1 mile of campus" pct={report.within_1mi_pct} />
        <ProgressRow label="Open to roommates" pct={report.roommates_ok_pct} />
        <Row style={{ flexWrap: 'wrap', marginTop: spacing.sm }}>
          {Object.entries(report.housing_types).map(([k, v]) => <Pill key={k} label={`${k}: ${v}`} color={colors.muted} />)}
        </Row>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  count: { fontSize: 12, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 10, color: colors.muted, marginTop: 4, textAlign: 'center', fontWeight: '600' },
  hl: { color: colors.accent },
  you: { fontSize: 10, color: colors.accent, fontWeight: '800' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  position: { backgroundColor: colors.bg, borderRadius: 10, padding: spacing.md, marginTop: spacing.md },
  insight: { fontSize: 14, color: colors.ink, lineHeight: 22 },
});
