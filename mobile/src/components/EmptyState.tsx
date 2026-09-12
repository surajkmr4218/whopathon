import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors, spacing } from '@/theme';

export function EmptyState({ emoji = '🏠', title, body, action, onAction }: { emoji?: string; title: string; body?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {action && onAction ? <Button title={action} variant="secondary" onPress={onAction} style={{ marginTop: spacing.lg }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emoji: { fontSize: 48, marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  body: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
});
