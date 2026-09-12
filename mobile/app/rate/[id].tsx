import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { useMatch, useRateMatch } from '@/api/hooks';
import { StarPicker, Stars } from '@/components/Stars';
import { Button, Card, Input, Loading, Muted, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme';

const HINT = ['', 'Would not recommend', 'Below expectations', 'It was fine', 'Good experience', 'Excellent, would recommend'];

export default function RateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);
  const router = useRouter();
  const match = useMatch(matchId);
  const rate = useRateMatch(matchId);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (match.data?.my_rating && stars === 0) {
      setStars(match.data.my_rating.stars);
      setComment(match.data.my_rating.comment);
    }
  }, [match.data, stars]);

  if (!match.data) return <Loading />;
  const m = match.data;
  const other = m.other_user;
  const role = m.role === 'renter' ? 'seller' : 'renter';

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Image source={{ uri: other.photo_url ?? undefined }} style={styles.avatar} />
        <Text style={styles.name}>Rate {other.name.split(' ')[0]} as a {role}</Text>
        <Stars rating={other.rating} label={`as ${role}`} />
        <Muted style={{ textAlign: 'center', marginTop: spacing.sm }}>Ratings show on {other.name.split(' ')[0]}'s cards so other students know what to expect.</Muted>
      </View>
      <Card>
        <StarPicker value={stars} onChange={setStars} />
        <Text style={styles.hint}>{HINT[stars] || 'Tap a star'}</Text>
        <Input label="What should other students know? (optional)" value={comment} onChangeText={setComment} multiline style={{ minHeight: 80 }}
          placeholder={role === 'seller' ? 'Photos accurate? Keys on time? Deposit returned?' : 'Paid on time? Left the place clean?'} />
        <Button title={m.my_rating ? 'Update rating' : 'Submit rating'} disabled={stars === 0} loading={rate.isPending}
          onPress={() => rate.mutate({ stars, comment }, { onSuccess: () => { Alert.alert('Thanks!', 'Your rating is live.'); router.back(); }, onError: (e) => Alert.alert('Oops', (e as Error).message) })} />
      </Card>
      <Muted style={{ textAlign: 'center' }}>One rating per match. You can update it any time.</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.bg, marginBottom: spacing.sm },
  name: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  hint: { textAlign: 'center', color: colors.muted, marginVertical: spacing.md, fontWeight: '600' },
});
