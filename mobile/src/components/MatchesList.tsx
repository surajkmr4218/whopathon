import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLikes, useMatches } from '@/api/hooks';
import { EmptyState } from '@/components/EmptyState';
import { Stars } from '@/components/Stars';
import { ErrorBox, Loading, Muted, Pill, Screen, SectionTitle } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { fmtRange, money, timeAgo } from '@/utils/dates';

export function MatchesList({ title, accent, role }: { title: string; accent: string; role: 'renter' | 'seller' }) {
  const router = useRouter();
  const q = useMatches(role);
  const likes = useLikes(role);
  const pendingListings = likes.data?.listings ?? [];
  const pendingRenters = likes.data?.renters ?? [];
  const pendingCount = pendingListings.length + pendingRenters.length;

  const Pending = () => {
    if (pendingCount === 0) return null;
    return (
      <View style={{ marginTop: spacing.md }}>
        <SectionTitle right={<Muted>{pendingCount}</Muted>}>You liked · waiting on them</SectionTitle>
        <Muted style={{ marginBottom: spacing.sm }}>
          {likes.data?.role === 'renter' ? "It becomes a match the moment the seller swipes right on you." : 'It becomes a match the moment they swipe right on your place.'}
        </Muted>
        {pendingListings.map((c) => (
          <Pressable key={c.listing.id} style={styles.row} onPress={() => router.push(`/listing/${c.listing.id}`)}>
            <Image source={{ uri: c.photos[0] }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{c.listing.title}</Text>
              <Text style={styles.listing}>{money(c.listing.asking_price)}/mo · {fmtRange(c.listing.available_from, c.listing.available_until)}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center' }}>
                {c.score ? <Pill label={`${c.score.overall}% match`} color={accent} /> : null}
                <Pill label="Pending" color={colors.warning} />
                <Stars rating={c.seller.rating} size={12} />
              </View>
            </View>
          </Pressable>
        ))}
        {pendingRenters.map((c) => (
          <Pressable key={c.renter.id} style={styles.row} onPress={() => router.push(`/renter-profile/${c.renter.id}`)}>
            <Image source={{ uri: c.renter.photo_url ?? undefined }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{c.renter.name}</Text>
              <Text style={styles.listing}>{fmtRange(c.profile.move_in, c.profile.move_out)} · up to {money(c.profile.max_budget)}/mo</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center' }}>
                <Pill label={`${c.score.overall}% match`} color={accent} />
                <Pill label="Pending" color={colors.warning} />
                <Stars rating={c.renter.rating} size={12} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <Screen scroll={false} padded={false}>
      <Text style={styles.h}>{title}</Text>
      {q.isLoading ? <Loading /> : q.error ? <View style={{ padding: spacing.lg }}><ErrorBox message={(q.error as Error).message} onRetry={() => q.refetch()} /></View> : (
        <FlatList
          data={q.data}
          keyExtractor={(m) => String(m.match.id)}
          contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
          onRefresh={() => { q.refetch(); likes.refetch(); }}
          refreshing={q.isFetching}
          ListEmptyComponent={pendingCount > 0 ? <Muted>No mutual matches yet.</Muted> : <EmptyState emoji="💬" title="No matches yet" body="When both sides swipe right you'll see the conversation here." />}
          ListFooterComponent={<Pending />}
          renderItem={({ item: m }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/chat/${m.match.id}`)}>
              <Image source={{ uri: m.other_user.photo_url ?? undefined }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <View style={styles.top}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={styles.name}>{m.other_user.name}</Text><Stars rating={m.other_user.rating} size={12} /></View>
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
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bg },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '800', color: colors.ink },
  time: { fontSize: 12, color: colors.muted },
  listing: { fontSize: 12, color: colors.muted, marginTop: 2 },
  preview: { fontSize: 14, color: colors.muted, marginTop: 4 },
});
