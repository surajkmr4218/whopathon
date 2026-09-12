import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { useCreateOffer, useMatch, useOffers, useRespondOffer } from '@/api/hooks';
import { OfferCard } from '@/components/OfferCard';
import { Button, Card, Input, Loading, Muted, Row, Screen, SectionTitle } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, spacing } from '@/theme';
import { daysBetween, isValidISO, money } from '@/utils/dates';

export default function OfferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);
  const router = useRouter();
  const { me } = useAuth();
  const match = useMatch(matchId);
  const offers = useOffers(matchId);
  const create = useCreateOffer(matchId);
  const respond = useRespondOffer(matchId);
  const [price, setPrice] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [countering, setCountering] = useState(false);

  useEffect(() => {
    const m = match.data;
    if (!m || price) return;
    const p = m.renter.profile;
    setPrice(String(m.listing.asking_price));
    setStart(p ? (p.move_in > m.listing.available_from ? p.move_in : m.listing.available_from) : m.listing.available_from);
    setEnd(p ? (p.move_out < m.listing.available_until ? p.move_out : m.listing.available_until) : m.listing.available_until);
  }, [match.data, price]);

  if (!match.data || offers.isLoading) return <Loading />;
  const m = match.data;
  const pending = offers.data?.find((o) => o.status === 'pending');
  const theirsPending = pending && pending.created_by !== me?.user.id;
  const valid = Number(price) > 0 && isValidISO(start) && isValidISO(end) && daysBetween(start, end) > 0;
  const showForm = !pending || countering;

  const submit = () => {
    if (countering && pending) {
      respond.mutate({ offerId: pending.id, action: 'counter', monthly_price: Number(price), start_date: start, end_date: end }, {
        onSuccess: () => { setCountering(false); Alert.alert('Counter sent'); },
        onError: (e) => Alert.alert('Oops', (e as Error).message),
      });
    } else {
      create.mutate({ monthly_price: Number(price), start_date: start, end_date: end }, {
        onSuccess: () => Alert.alert('Offer sent', `${m.other_user.name.split(' ')[0]} can accept, reject or counter.`),
        onError: (e) => Alert.alert('Oops', (e as Error).message),
      });
    }
  };

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{m.listing.title}</Text>
      <Muted style={{ marginBottom: spacing.lg }}>Asking {money(m.listing.asking_price)}/mo · with {m.other_user.name}</Muted>

      {pending ? (
        <OfferCard offer={pending} mine={!theirsPending}>
          {theirsPending && !countering ? (
            <Row>
              <Button title="Accept" small style={{ flex: 1 }} loading={respond.isPending} onPress={() => respond.mutate({ offerId: pending.id, action: 'accept' }, { onSuccess: () => Alert.alert('Accepted! 🎉', 'Work out the details in chat.') })} />
              <Button title="Counter" small variant="secondary" style={{ flex: 1 }} onPress={() => setCountering(true)} />
              <Button title="Reject" small variant="danger" style={{ flex: 1 }} onPress={() => respond.mutate({ offerId: pending.id, action: 'reject' })} />
            </Row>
          ) : !theirsPending ? <Muted>Waiting for {m.other_user.name.split(' ')[0]} to respond.</Muted> : null}
        </OfferCard>
      ) : null}

      {showForm ? (
        <Card>
          <SectionTitle>{countering ? 'Your counter offer' : 'Make an offer'}</SectionTitle>
          <Input label="Monthly price ($)" value={price} onChangeText={setPrice} keyboardType="number-pad" />
          <Input label="Start (YYYY-MM-DD)" value={start} onChangeText={setStart} autoCapitalize="none" />
          <Input label="End (YYYY-MM-DD)" value={end} onChangeText={setEnd} autoCapitalize="none" hint={valid ? `${daysBetween(start, end)} days · ${money(Number(price) / 30 * daysBetween(start, end))} total` : 'Enter valid dates'} />
          <Row>
            {countering ? <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setCountering(false)} /> : null}
            <Button title={countering ? 'Send counter' : 'Send offer'} style={{ flex: 2 }} disabled={!valid} loading={create.isPending || respond.isPending} onPress={submit} />
          </Row>
        </Card>
      ) : null}

      {offers.data && offers.data.filter((o) => o.status !== 'pending').length > 0 ? (
        <View>
          <SectionTitle>History</SectionTitle>
          {offers.data.filter((o) => o.status !== 'pending').map((o) => <OfferCard key={o.id} offer={o} mine={o.created_by === me?.user.id} />)}
        </View>
      ) : null}
      <Button title="Back to chat" variant="ghost" onPress={() => router.replace(`/chat/${matchId}`)} />
    </Screen>
  );
}
