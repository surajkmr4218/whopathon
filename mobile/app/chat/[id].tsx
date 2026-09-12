import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMatch, useMessages, useSendMessage } from '@/api/hooks';
import { Stars } from '@/components/Stars';
import { Loading, Pill } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, spacing } from '@/theme';
import { money, timeAgo } from '@/utils/dates';

export default function Chat() {
  const { id, prefill } = useLocalSearchParams<{ id: string; prefill?: string }>();
  const matchId = Number(id);
  const router = useRouter();
  const nav = useNavigation();
  const { me } = useAuth();
  const match = useMatch(matchId);
  const msgs = useMessages(matchId);
  const send = useSendMessage(matchId);
  const [text, setText] = useState(prefill ?? '');
  const list = useRef<FlatList>(null);

  useEffect(() => {
    if (match.data) nav.setOptions({ title: match.data.other_user.name });
  }, [match.data, nav]);

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    send.mutate(body);
  };

  if (!match.data) return <Loading />;
  const m = match.data;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <Pressable style={styles.banner} onPress={() => router.push(`/offer/${matchId}`)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{m.listing.title} · {money(m.listing.asking_price)}/mo</Text>
            <Text style={styles.bannerSub}>{m.latest_offer ? `Latest offer ${money(m.latest_offer.monthly_price)}/mo · ${m.latest_offer.status}` : 'No offers yet — tap to make one'}</Text>
          </View>
          {m.latest_offer ? <Pill label={m.latest_offer.status} color={m.latest_offer.status === 'accepted' ? colors.success : colors.warning} /> : <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
        </Pressable>
        <Pressable style={[styles.banner, { marginTop: 6 }]} onPress={() => router.push(`/rate/${matchId}`)}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Stars rating={m.other_user.rating} />
            <Text style={styles.bannerSub}>{m.my_rating ? `You rated ${m.my_rating.stars}★ · tap to update` : `Rate ${m.other_user.name.split(' ')[0]} after your sublease`}</Text>
          </View>
          <Ionicons name="star-outline" size={18} color={colors.warning} />
        </Pressable>
        <FlatList
          ref={list}
          data={msgs.data ?? []}
          keyExtractor={(x) => String(x.id)}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const mine = item.sender_id === me?.user.id;
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.body, mine && { color: '#fff' }]}>{item.body}</Text>
                <Text style={[styles.time, mine && { color: '#FFD6D7' }]}>{timeAgo(item.created_at)}{mine && item.read_at ? ' · read' : ''}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>You matched with {m.other_user.name.split(' ')[0]}. Say hi!</Text>}
        />
        <View style={styles.inputRow}>
          <TextInput value={text} onChangeText={setText} placeholder="Message…" placeholderTextColor="#9CA3AF" style={styles.input} multiline onSubmitEditing={submit} />
          <Pressable onPress={submit} style={[styles.send, !text.trim() && { opacity: 0.4 }]}><Ionicons name="arrow-up" size={22} color="#fff" /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, padding: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  bannerSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  body: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  time: { fontSize: 10, color: colors.muted, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: spacing.xl },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 120, color: colors.ink },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
