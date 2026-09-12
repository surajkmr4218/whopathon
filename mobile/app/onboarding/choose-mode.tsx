import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, Title } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, radius, spacing } from '@/theme';

export default function ChooseMode() {
  const { me, setMode } = useAuth();
  const router = useRouter();

  const pick = async (mode: 'renter' | 'seller') => {
    const m = await setMode(mode);
    if (mode === 'renter') router.replace(m.has_renter_profile ? '/(renter)/discover' : '/onboarding/renter');
    else router.replace(m.listing_id ? '/(seller)/renters' : '/onboarding/seller');
  };

  return (
    <Screen>
      <Title sub={`Hi ${me?.user.name.split(' ')[0] ?? 'there'} — you can switch anytime without a second account.`}>What brings you here?</Title>
      <Pressable style={[styles.card, { borderColor: colors.accent }]} onPress={() => pick('renter')}>
        <Text style={styles.emoji}>🔎</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.h}>Find housing</Text>
          <Text style={styles.p}>Swipe through places that actually match your dates, budget and must-haves.</Text>
        </View>
      </Pressable>
      <Pressable style={[styles.card, { borderColor: colors.seller }]} onPress={() => pick('seller')}>
        <Text style={styles.emoji}>🏠</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.h}>List my place</Text>
          <Text style={styles.p}>See who's already looking, get a smart price, and recover more of your rent.</Text>
        </View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, borderWidth: 2, marginBottom: spacing.lg },
  emoji: { fontSize: 40 },
  h: { fontSize: 20, fontWeight: '800', color: colors.ink },
  p: { fontSize: 14, color: colors.muted, marginTop: 4, lineHeight: 20 },
});
