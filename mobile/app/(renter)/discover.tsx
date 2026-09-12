import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useDiscover, useSaved, useSwipe, useToggleSave } from '@/api/hooks';
import type { ListingCardData } from '@/api/types';
import { DeckActions } from '@/components/DeckScreen';
import { EmptyState } from '@/components/EmptyState';
import { ListingCard } from '@/components/ListingCard';
import { SwipeDeck, SwipeDeckHandle } from '@/components/SwipeDeck';
import { ErrorBox, Loading, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function Discover() {
  const router = useRouter();
  const q = useDiscover();
  const saved = useSaved();
  const swipe = useSwipe();
  const toggleSave = useToggleSave();
  const deck = useRef<SwipeDeckHandle>(null);
  const [cards, setCards] = useState<ListingCardData[]>([]);
  const [deckKey, setDeckKey] = useState(0);

  useEffect(() => {
    if (q.data) {
      setCards(q.data);
      setDeckKey((k) => k + 1);
    }
  }, [q.data]);

  const onSwipe = (card: ListingCardData, dir: 'left' | 'right') => {
    setCards((c) => c.filter((x) => x.listing.id !== card.listing.id));
    swipe.mutate(
      { listing_id: card.listing.id, direction: dir === 'right' ? 'like' : 'pass' },
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

  const top = cards[0];
  const isSaved = !!top && !!saved.data?.some((s) => s.listing.id === top.listing.id);

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.header}>
        <Text style={styles.h}>Discover</Text>
        <Text style={styles.sub}>{q.data ? `${cards.length} place${cards.length === 1 ? '' : 's'} match your dates` : ' '}</Text>
      </View>
      <View style={styles.deck}>
        {q.isLoading ? <Loading /> : q.error ? <ErrorBox message={(q.error as Error).message} onRetry={() => q.refetch()} /> : (
          <SwipeDeck
            key={deckKey}
            ref={deck}
            data={cards}
            keyExtractor={(c) => String(c.listing.id)}
            renderCard={(c) => <ListingCard card={c} />}
            onSwipe={onSwipe}
            onTap={(c) => router.push(`/listing/${c.listing.id}`)}
            likeLabel="INTERESTED"
            empty={<EmptyState emoji="✨" title="You've seen every place that fits" body="Widen your dates or budget to see more, or check back — new listings appear as sellers post them."
              action="Adjust preferences" onAction={() => router.push({ pathname: '/onboarding/renter', params: { edit: '1' } })} />}
          />
        )}
      </View>
      {cards.length > 0 ? (
        <DeckActions onPass={() => deck.current?.swipe('left')} onLike={() => deck.current?.swipe('right')} extraIcon={isSaved ? 'bookmark' : 'bookmark-outline'} extraActive={isSaved}
          onExtra={() => top && toggleSave.mutate({ listingId: top.listing.id, saved: isSaved })} />
      ) : <View style={{ height: 96 }} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  h: { fontSize: 28, fontWeight: '800', color: colors.ink },
  sub: { color: colors.muted, marginTop: 2 },
  deck: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
