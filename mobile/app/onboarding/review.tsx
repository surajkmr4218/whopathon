import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useProfile } from '@/api/hooks';
import { VerifiedBadge } from '@/components/Badges';
import { Button, Card, Loading, Muted, Row, Screen, Stat } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, flexibilityLabel, spacing } from '@/theme';
import { daysBetween, fmtRange, money } from '@/utils/dates';

const PREF = { none: "Don't care", preferred: 'Nice to have', required: 'Must have' };

/** Shows everything the renter entered, with per-section Edit, before the swipe deck. */
export default function ReviewPreferences() {
  const router = useRouter();
  const { me } = useAuth();
  const p = useProfile();
  if (p.isLoading) return <Loading />;
  if (!p.data) {
    router.replace('/onboarding/renter');
    return null;
  }
  const d = p.data;
  const edit = (step: number) => router.push({ pathname: '/onboarding/renter', params: { edit: '1', step: String(step), back: 'review' } });
  const Section = ({ title, step, children }: { title: string; step: number; children: React.ReactNode }) => (
    <Card>
      <Row between style={{ marginBottom: spacing.sm }}>
        <Text style={styles.section}>{title}</Text>
        <Button title="Edit" small variant="secondary" onPress={() => edit(step)} />
      </Row>
      {children}
    </Card>
  );

  return (
    <Screen>
      <Text style={styles.h}>Here's what we'll match on</Text>
      <Row style={{ marginBottom: spacing.lg, flexWrap: 'wrap' }}>
        <Muted>{me?.user.name} · {me?.user.university}</Muted>
        {me?.user.verified ? <VerifiedBadge small /> : null}
      </Row>
      <Section title="Location" step={0}>
        <Stat label="Campus" value={d.university} sub={d.city} />
      </Section>
      <Section title="Dates" step={1}>
        <Stat label="Move in → move out" value={fmtRange(d.move_in, d.move_out)} sub={`${daysBetween(d.move_in, d.move_out)} days · ${flexibilityLabel[d.flexibility]}`} />
      </Section>
      <Section title="Budget" step={2}>
        <Row between>
          <Stat label="Max monthly" value={`${money(d.max_budget)}/mo`} />
          <Stat label="Max distance" value={`${d.max_distance_miles} mi`} />
        </Row>
      </Section>
      <Section title="Preferences" step={3}>
        <View style={{ gap: 4 }}>
          <Text style={styles.line}>Furnished: <Text style={styles.b}>{PREF[d.furnished_pref]}</Text></Text>
          <Text style={styles.line}>Parking: <Text style={styles.b}>{PREF[d.parking_pref]}</Text></Text>
          <Text style={styles.line}>Housing type: <Text style={styles.b}>{d.housing_type === 'any' ? 'Any' : d.housing_type}</Text></Text>
          <Text style={styles.line}>Roommates: <Text style={styles.b}>{d.roommates_ok ? 'Okay with roommates' : 'No roommates'}</Text></Text>
        </View>
      </Section>
      <Muted style={{ marginBottom: spacing.md }}>
        Match % = 40% dates · 25% price · 20% location · 15% preferences. Change anything above and the deck re-ranks instantly.
      </Muted>
      <Button title="Looks good — start swiping" onPress={() => router.replace('/(renter)/discover')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  line: { fontSize: 15, color: colors.ink },
  b: { fontWeight: '700' },
});
