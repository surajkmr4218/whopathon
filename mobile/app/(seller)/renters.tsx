import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useRenters, useSwipe } from '@/api/hooks';
import type { RenterCardData } from '@/api/types';
import { DeckActions } from '@/components/DeckScreen';
import { EmptyState } from '@/components/EmptyState';
import { RenterCard } from '@/components/RenterCard';
import { SwipeDeck, SwipeDeckHandle } from '@/components/SwipeDeck';
import { ErrorBox, Loading, Screen } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, spacing } from '@/theme';

export default function Renters() {
  const router = useRouter();
  const { me } = useAuth();
  const listingId = me?.listing_id ?? null;
  const q = useRenters(listingId);
  const swipe = useSwipe();
  const deck = useRef<SwipeDeckHandle>(null);
  const [cards, setCards] = useState<RenterCardData[]>([]);
  const [deckKey, setDeckKey] = useState(0);

  useEffect(() => {
    if (q.data) {
      setCards(q.data.cards);
      setDeckKey((k) => k + 1);
    }
  }, [q.data]);

  const onSwipe = (card: RenterCardData, dir: 'left' | 'right') => {
    if (!listingId) return;
    setCards((c) => c.filter((x) => x.renter.id !== card.renter.id));
    swipe.mutate(
      { listing_id: listingId, renter_id: card.renter.id, direction: dir === 'right' ? 'like' : 'pass' },
      {
        onSuccess: (res) => { if (res.match) router.push(`/match/${res.match.match.id}`); },
        onError: (e) => {
          Alert.alert("Couldn't save your swipe", (e as Error).message);
          setCards((c) => [card, ...c]);
          setDeckKey((k) => k + 1);
        },
      },
    );
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.header}>
        <Text style={styles.h}>Renters</Text>
        <Text style={styles.sub}>{q.data ? `${q.data.count} verified students are currently looking for a place like yours` : ' '}</Text>
      </View>
      <View style={styles.deck}>
        {q.isLoading ? <Loading /> : q.error ? <ErrorBox message={(q.error as Error).message} onRetry={() => q.refetch()} /> : (
          <SwipeDeck
            key={deckKey}
            ref={deck}
            data={cards}
            keyExtractor={(c) => String(c.renter.id)}
            renderCard={(c) => <RenterCard card={c} />}
            onSwipe={onSwipe}
            onTap={(c) => router.push(`/renter-profile/${c.renter.id}`)}
            likeLabel="RENT"
            empty={<EmptyState emoji="🙌" title="You've reviewed everyone compatible" body="New renters show up here automatically as they set their dates. Check your dashboard for ways to widen the pool."
              action="Open dashboard" onAction={() => router.push('/(seller)/dashboard')} />}
          />
        )}
      </View>
      {cards.length > 0 ? <DeckActions color={colors.seller} onPass={() => deck.current?.swipe('left')} onLike={() => deck.current?.swipe('right')} /> : <View style={{ height: 96 }} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  h: { fontSize: 28, fontWeight: '800', color: colors.ink },
  sub: { color: colors.muted, marginTop: 2 },
  deck: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
