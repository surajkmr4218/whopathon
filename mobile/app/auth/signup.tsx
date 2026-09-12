import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, ChipRow, Input, Muted, Screen, Title } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, spacing, UNIVERSITIES } from '@/theme';

export default function Signup() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState(UNIVERSITIES[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      await signup({ name: name.trim(), email: email.trim(), password, university });
      router.replace('/onboarding/choose-mode');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title sub="Use your .edu email to get the verified student badge.">Create account</Title>
      <Input label="Name" value={name} onChangeText={setName} placeholder="Jordan Lee" />
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@school.edu" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 4 characters" />
      <Text style={styles.label}>University</Text>
      <ChipRow options={UNIVERSITIES} value={university} onChange={setUniversity} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Sign up" onPress={go} loading={busy} disabled={!name || !email || password.length < 4} />
      <Muted style={{ textAlign: 'center', marginTop: spacing.lg }}>
        Already have an account? <Link href="/auth/login" style={{ color: colors.accent, fontWeight: '700' }}>Log in</Link>
      </Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  error: { color: colors.danger, marginBottom: spacing.md },
});
