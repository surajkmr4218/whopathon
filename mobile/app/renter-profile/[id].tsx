import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { useSwipe, useUser } from '@/api/hooks';
import { VerifiedBadge } from '@/components/Badges';
import { Stars } from '@/components/Stars';
import { Button, Card, ErrorBox, Loading, Muted, Row, Screen, SectionTitle, Stat } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, flexibilityLabel, spacing } from '@/theme';
import { daysBetween, fmtRange, money } from '@/utils/dates';

export default function RenterProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { me } = useAuth();
  const q = useUser(Number(id));
  const swipe = useSwipe();
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorBox message={(q.error as Error)?.message ?? 'Not found'} /></Screen>;
  const u = q.data;
  const p = u.profile;
  const canSwipe = me?.user.mode === 'seller' && !!me.listing_id && u.id !== me.user.id;
  const act = (direction: 'like' | 'pass') => swipe.mutate({ listing_id: me!.listing_id!, renter_id: u.id, direction }, {
    onSuccess: (res) => (res.match ? router.replace(`/match/${res.match.match.id}`) : router.back()),
    onError: (e) => Alert.alert('Oops', (e as Error).message),
  });

  return (
    <Screen>
      <Row style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
        <Image source={{ uri: u.photo_url ?? undefined }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{u.name}</Text>
          <Muted>{u.university}{p ? ` · ${p.city}` : ''}</Muted>
          <Stars rating={u.rating_as_renter} label="as renter" size={15} />
          {u.verified ? <View style={{ marginTop: 6 }}><VerifiedBadge /></View> : null}
        </View>
      </Row>
      {p ? (
        <>
          <Card>
            <SectionTitle>Needs housing</SectionTitle>
            <Text style={styles.big}>{fmtRange(p.move_in, p.move_out)}</Text>
            <Muted>{daysBetween(p.move_in, p.move_out)} days · {flexibilityLabel[p.flexibility]}</Muted>
          </Card>
          <Card>
            <Row between>
              <Stat label="Budget" value={`${money(p.max_budget)}/mo`} />
              <Stat label="Max distance" value={`${p.max_distance_miles} mi`} />
            </Row>
          </Card>
          <Card>
            <SectionTitle>Preferences</SectionTitle>
            <Muted>Furnished: {p.furnished_pref}</Muted>
            <Muted>Parking: {p.parking_pref}</Muted>
            <Muted>Housing type: {p.housing_type}</Muted>
            <Muted>{p.roommates_ok ? 'Okay with roommates' : 'No roommates'}</Muted>
          </Card>
        </>
      ) : <Muted>This user hasn't set up a renter profile.</Muted>}
      {canSwipe ? (
        <Row>
          <Button title="Pass" variant="secondary" style={{ flex: 1 }} onPress={() => act('pass')} />
          <Button title="I'd rent to them ♥" variant="seller" style={{ flex: 2 }} onPress={() => act('like')} loading={swipe.isPending} />
        </Row>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.sellerSoft },
  name: { fontSize: 24, fontWeight: '800', color: colors.ink },
  big: { fontSize: 18, fontWeight: '800', color: colors.ink },
});
