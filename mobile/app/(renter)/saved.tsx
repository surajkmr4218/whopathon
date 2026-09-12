import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSaved, useToggleSave } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { MatchScore } from '@/components/MatchScore';
import { Button, Loading, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { fmtRange, money } from '@/utils/dates';

export default function Saved() {
  const router = useRouter();
  const q = useSaved();
  const toggle = useToggleSave();
  return (
    <Screen scroll={false} padded={false}>
      <Text style={styles.h}>Saved</Text>
      {q.isLoading ? <Loading /> : (
        <FlatList
          data={q.data}
          keyExtractor={(c) => String(c.listing.id)}
          contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState emoji="🔖" title="Nothing saved yet" body="Tap the bookmark on a card to keep it here. Saving is separate from swiping right." />}
          renderItem={({ item: c }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/listing/${c.listing.id}`)}>
              <Image source={{ uri: c.photos[0] }} style={styles.photo} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{c.listing.title}</Text>
                <Text style={styles.sub}>{money(c.listing.asking_price)}/mo · {fmtRange(c.listing.available_from, c.listing.available_until)}</Text>
                <Button title="Remove" small variant="ghost" style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} onPress={() => toggle.mutate({ listingId: c.listing.id, saved: true })} />
              </View>
              {c.score ? <MatchScore score={c.score.overall} size="sm" /> : null}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 28, fontWeight: '800', color: colors.ink, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  photo: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.bg },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
