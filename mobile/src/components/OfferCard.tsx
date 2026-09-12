import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Offer } from '@/api/types';
import { Card, Pill, Row, Stat } from '@/components/ui';
import { colors } from '@/theme';
import { daysBetween, fmtRange, money } from '@/utils/dates';

const STATUS_COLOR: Record<Offer['status'], string> = { pending: colors.warning, accepted: colors.success, rejected: colors.danger, countered: colors.muted };

export function OfferCard({ offer, mine, children }: { offer: Offer; mine: boolean; children?: React.ReactNode }) {
  return (
    <Card style={offer.status === 'pending' ? { borderColor: colors.warning } : undefined}>
      <Row between>
        <Text style={styles.who}>{mine ? 'Your offer' : 'Their offer'}</Text>
        <Pill label={offer.status.toUpperCase()} color={STATUS_COLOR[offer.status]} />
      </Row>
      <Row between style={{ marginTop: 10 }}>
        <Stat label="Monthly" value={`${money(offer.monthly_price)}/mo`} />
        <Stat label="Dates" value={fmtRange(offer.start_date, offer.end_date)} sub={`${daysBetween(offer.start_date, offer.end_date)} days`} />
      </Row>
      {children ? <View style={{ marginTop: 12 }}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({ who: { fontSize: 15, fontWeight: '700', color: colors.ink } });
