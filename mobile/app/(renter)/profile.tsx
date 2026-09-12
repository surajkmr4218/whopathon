import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useProfile } from '@/api/hooks';
import { VerifiedBadge } from '@/components/Badges';
import { Button, Card, Muted, Row, Screen, SectionTitle, Stat } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, flexibilityLabel, spacing } from '@/theme';
import { fmtRange, money } from '@/utils/dates';

export default function Profile() {
  const router = useRouter();
  const { me, logout } = useAuth();
  const p = useProfile();
  const u = me?.user;

  return (
    <Screen>
      <Row style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
        <Image source={{ uri: u?.photo_url ?? undefined }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{u?.name}</Text>
          <Muted>{u?.email}</Muted>
          <Muted>{u?.university}</Muted>
          {u?.verified ? <View style={{ marginTop: 6 }}><VerifiedBadge /></View> : null}
        </View>
      </Row>
      {p.data ? (
        <Card>
          <SectionTitle right={<Button title="Edit" small variant="secondary" onPress={() => router.push('/onboarding/review')} />}>Looking for</SectionTitle>
          <Row between><Stat label="Dates" value={fmtRange(p.data.move_in, p.data.move_out)} sub={flexibilityLabel[p.data.flexibility]} /></Row>
          <Row between style={{ marginTop: spacing.md }}>
            <Stat label="Budget" value={`${money(p.data.max_budget)}/mo`} />
            <Stat label="Max distance" value={`${p.data.max_distance_miles} mi`} />
          </Row>
          <Muted style={{ marginTop: spacing.md }}>
            Furnished: {p.data.furnished_pref} · Parking: {p.data.parking_pref} · {p.data.housing_type} · {p.data.roommates_ok ? 'roommates ok' : 'no roommates'}
          </Muted>
        </Card>
      ) : null}
      <Button title="Log out" variant="ghost" onPress={async () => { await logout(); router.replace('/auth/login'); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentSoft },
  name: { fontSize: 22, fontWeight: '800', color: colors.ink },
});
