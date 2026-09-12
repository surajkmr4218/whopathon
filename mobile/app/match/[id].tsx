import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { useMatch } from '@/api/hooks';
import { Button, Loading, Screen } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, spacing } from '@/theme';
import { money } from '@/utils/dates';

export default function MatchSuccess() {
  const { id, prefill } = useLocalSearchParams<{ id: string; prefill?: string }>();
  const router = useRouter();
  const { me } = useAuth();
  const q = useMatch(Number(id));
  const left = useSharedValue(0);
  const right = useSharedValue(0);
  const title = useSharedValue(0);

  useEffect(() => {
    left.value = withSpring(1, { damping: 10 });
    right.value = withDelay(120, withSpring(1, { damping: 10 }));
    title.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, [left, right, title]);

  const leftStyle = useAnimatedStyle(() => ({ transform: [{ scale: left.value }, { translateX: -20 + 20 * left.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ scale: right.value }, { translateX: 20 - 20 * right.value }] }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: title.value, transform: [{ translateY: 20 - 20 * title.value }] }));

  if (q.isLoading || !q.data) return <Loading />;
  const m = q.data;
  const other = m.other_user;
  const isRenter = m.role === 'renter';

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <View style={styles.avatars}>
        <Animated.View style={[styles.avatarWrap, leftStyle]}><Image source={{ uri: me?.user.photo_url ?? undefined }} style={styles.avatar} /></Animated.View>
        <Animated.View style={[styles.avatarWrap, rightStyle]}><Image source={{ uri: other.photo_url ?? undefined }} style={styles.avatar} /></Animated.View>
      </View>
      <Animated.View style={[{ alignItems: 'center' }, titleStyle]}>
        <Text style={styles.title}>It's a Match!</Text>
        <Text style={styles.sub}>
          {isRenter ? `${other.name.split(' ')[0]} would rent you ` : `${other.name.split(' ')[0]} is interested in `}
          <Text style={{ fontWeight: '800', color: colors.ink }}>{m.listing.title}</Text> · {money(m.listing.asking_price)}/mo
          {m.score ? ` · ${m.score.overall}% match` : ''}
        </Text>
      </Animated.View>
      <View style={{ marginTop: spacing.xxl, gap: spacing.sm }}>
        <Button title="Send a message" onPress={() => router.replace({ pathname: `/chat/${m.match.id}`, params: prefill ? { prefill } : {} })} />
        <Button title={isRenter ? 'Make an offer' : 'Review / make an offer'} variant="secondary" onPress={() => router.replace(`/offer/${m.match.id}`)} />
        <Button title={isRenter ? 'View listing' : `View ${other.name.split(' ')[0]}'s profile`} variant="secondary"
          onPress={() => router.replace(isRenter ? `/listing/${m.listing.id}` : `/renter-profile/${other.id}`)} />
        <Button title="Keep swiping" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatars: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.xl },
  avatarWrap: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: colors.accent, overflow: 'hidden', backgroundColor: colors.card, marginHorizontal: -10 },
  avatar: { width: '100%', height: '100%' },
  title: { fontSize: 40, fontWeight: '900', color: colors.accent, letterSpacing: -1 },
  sub: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 24, paddingHorizontal: spacing.lg },
});
