import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

/** Bottom action row shared by both swipe decks. */
export function DeckActions({ onPass, onLike, onExtra, extraIcon, extraActive, color = colors.accent }: {
  onPass: () => void; onLike: () => void; onExtra?: () => void; extraIcon?: keyof typeof Ionicons.glyphMap; extraActive?: boolean; color?: string;
}) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onPass} style={[styles.btn, { borderColor: colors.danger }]}><Ionicons name="close" size={32} color={colors.danger} /></Pressable>
      {onExtra && extraIcon ? (
        <Pressable onPress={onExtra} style={[styles.btn, styles.small, { borderColor: color, backgroundColor: extraActive ? color : colors.card }]}>
          <Ionicons name={extraIcon} size={22} color={extraActive ? '#fff' : color} />
        </Pressable>
      ) : null}
      <Pressable onPress={onLike} style={[styles.btn, { borderColor: colors.success }]}><Ionicons name="heart" size={32} color={colors.success} /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.md },
  btn: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  small: { width: 48, height: 48, borderRadius: 24 },
});
