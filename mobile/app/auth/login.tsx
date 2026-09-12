import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Input, Muted, Screen } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, spacing } from '@/theme';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { demo } = useLocalSearchParams<{ demo?: string }>();

  useEffect(() => {
    // Deep link `/auth/login?demo=1` logs straight into the demo account (handy for judges and simulator runs).
    if (demo === '1') go('demo@osu.edu', 'password');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  const go = async (e = email, p = password) => {
    setBusy(true);
    setError(null);
    try {
      const m = await login(e.trim(), p);
      // Demo flow: show the entered preferences first so they can be walked through and changed.
      if (e.trim() === 'demo@osu.edu' && m.has_renter_profile) router.replace('/onboarding/review');
      else router.replace('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logo}>SubSwipe</Text>
        <Text style={styles.tag}>Match your dates. Recover your rent.</Text>
      </View>
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@school.edu" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Log in" onPress={() => go()} loading={busy} />
      <Button title="Use demo account" variant="secondary" style={{ marginTop: spacing.sm }} onPress={() => { setEmail('demo@osu.edu'); setPassword('password'); go('demo@osu.edu', 'password'); }} />
      <Muted style={{ textAlign: 'center', marginTop: spacing.lg }}>
        New here? <Link href="/auth/signup" style={{ color: colors.accent, fontWeight: '700' }}>Create an account</Link>
      </Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: spacing.xxl * 1.5, alignItems: 'center' },
  logo: { fontSize: 42, fontWeight: '900', color: colors.accent, letterSpacing: -1 },
  tag: { fontSize: 16, color: colors.muted, marginTop: spacing.sm },
  error: { color: colors.danger, marginBottom: spacing.md },
});
