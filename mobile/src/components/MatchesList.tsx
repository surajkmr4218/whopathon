import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';

import { useMatches } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBox, Loading, Pill, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { fmtRange, money, timeAgo } from '@/utils/dates';

export function MatchesList({ title, accent }: { title: string; accent: string }) {
  const router = useRouter();
  const q = useMatches();
  return (
    <Screen scroll={false} padded={false}>
      <Text style={styles.h}>{title}</Text>
      {q.isLoading ? <Loading /> : q.error ? <View style={{ padding: spacing.lg }}><ErrorBox message={(q.error as Error).message} onRetry={() => q.refetch()} /></View> : (
        <FlatList
          data={q.data}
          keyExtractor={(m) => String(m.match.id)}
          contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
          onRefresh={() => q.refetch()}
          refreshing={q.isFetching}
          ListEmptyComponent={<EmptyState emoji="💬" title="No matches yet" body="When both sides swipe right you'll see the conversation here." />}
          renderItem={({ item: m }) => (
            <View style={styles.row} onTouchEnd={() => router.push(`/chat/${m.match.id}`)}>
              <Image source={{ uri: m.other_user.photo_url ?? undefined }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <View style={styles.top}>
                  <Text style={styles.name}>{m.other_user.name}</Text>
                  {m.last_message ? <Text style={styles.time}>{timeAgo(m.last_message.created_at)}</Text> : null}
                </View>
                <Text style={styles.listing} numberOfLines={1}>{m.listing.title} · {money(m.listing.asking_price)}/mo · {fmtRange(m.listing.available_from, m.listing.available_until)}</Text>
                <Text style={[styles.preview, m.unread > 0 && { color: colors.ink, fontWeight: '700' }]} numberOfLines={1}>
                  {m.last_message ? m.last_message.body : "It's a match! Say hi 👋"}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  {m.score ? <Pill label={`${m.score.overall}% match`} color={accent} /> : null}
                  {m.latest_offer ? <Pill label={`Offer ${m.latest_offer.status}`} color={m.latest_offer.status === 'accepted' ? colors.success : colors.warning} /> : null}
                  {m.unread > 0 ? <Pill label={`${m.unread} new`} color={colors.accent} soft={false} /> : null}
                </View>
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 28, fontWeight: '800', color: colors.ink, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '800', color: colors.ink },
  time: { fontSize: 12, color: colors.muted },
  listing: { fontSize: 12, color: colors.muted, marginTop: 2 },
  preview: { fontSize: 14, color: colors.muted, marginTop: 4 },
});
