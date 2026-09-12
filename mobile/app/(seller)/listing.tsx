import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useMyListings, useUpdateListing, useUploadPhoto } from '@/api/hooks';
import type { Urgency } from '@/api/types';
import { UrgencyBadge } from '@/components/Badges';
import { DealBar } from '@/components/DealBar';
import { Button, Card, Chip, ChipRow, Input, Loading, Muted, Row, Screen, SectionTitle } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, spacing, urgencyLabel } from '@/theme';
import { fmtRange, money } from '@/utils/dates';

export default function MyListing() {
  const router = useRouter();
  const { me, setMode, logout } = useAuth();

  const switchToRenter = async () => {
    const m = await setMode('renter');
    router.replace(m.has_renter_profile ? '/(renter)/discover' : '/onboarding/renter');
  };
  const q = useMyListings();
  const id = me?.listing_id ?? 0;
  const update = useUpdateListing(id);
  const upload = useUploadPhoto(id);
  const card = q.data?.find((c) => c.listing.id === id) ?? q.data?.[0];
  const [price, setPrice] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('normal');
  const [partial, setPartial] = useState(false);

  useEffect(() => {
    if (card) { setPrice(String(card.listing.asking_price)); setUrgency(card.listing.urgency); setPartial(card.listing.accepts_partial); }
  }, [card]);

  const addPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled) upload.mutate(res.assets[0].uri, { onError: (e) => Alert.alert('Upload failed', (e as Error).message) });
  };

  if (q.isLoading) return <Loading />;
  if (!card) return <Screen><Button title="Create a listing" variant="seller" onPress={() => router.push('/onboarding/seller')} /></Screen>;
  const l = card.listing;
  const dirty = Number(price) !== l.asking_price || urgency !== l.urgency || partial !== l.accepts_partial;

  return (
    <Screen>
      <Text style={styles.h}>My listing</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: spacing.md }}>
        {card.photos.map((p) => <Image key={p} source={{ uri: p }} style={styles.photo} />)}
        <View style={styles.addPhoto} onTouchEnd={addPhoto}><Text style={{ fontSize: 28, color: colors.seller }}>＋</Text><Muted>Add photo</Muted></View>
      </ScrollView>
      <Row between>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{l.title}</Text>
          <Muted>{l.address}, {l.city} · {l.distance_miles} mi from {l.university}</Muted>
          <Muted>{fmtRange(l.available_from, l.available_until)} · status: {l.status}</Muted>
        </View>
        <UrgencyBadge urgency={l.urgency} />
      </Row>
      <Card style={{ marginTop: spacing.lg }}>
        <SectionTitle>Pricing & urgency</SectionTitle>
        <Input label="Asking price ($/mo)" value={price} onChangeText={setPrice} keyboardType="number-pad"
          hint={l.previous_price ? `Was ${money(l.previous_price)} — renters see a PRICE DROP badge` : `Your obligation is ${money(l.monthly_rent)}/mo`} />
        <ChipRow options={['normal', 'need_filled', 'urgent'] as Urgency[]} value={urgency} onChange={setUrgency} labels={urgencyLabel} color={colors.seller} />
        <Row style={{ marginBottom: spacing.md }}>
          <Chip label="Open to partial fills" selected={partial} onPress={() => setPartial(true)} color={colors.seller} />
          <Chip label="One renter only" selected={!partial} onPress={() => setPartial(false)} color={colors.seller} />
        </Row>
        <Button title="Save changes" variant="seller" disabled={!dirty} loading={update.isPending}
          onPress={() => update.mutate({ asking_price: Number(price), urgency, accepts_partial: partial })} />
      </Card>
      <SectionTitle>How renters see your price</SectionTitle>
      <DealBar deal={card.deal} />
      <Card>
        <SectionTitle>Details</SectionTitle>
        <Muted>{l.housing_type} · {l.bedrooms} bd · {l.bathrooms} ba · {l.furnished ? 'furnished' : 'unfurnished'} · {l.parking ? 'parking' : 'no parking'} · {l.roommates} roommates</Muted>
        <Muted>{l.amenities.join(' · ')}</Muted>
        <Muted>True cost to renters: {money(card.true_monthly_cost)}/mo</Muted>
      </Card>
      <Card style={{ borderColor: colors.accent }}>
        <SectionTitle>Looking for a place yourself?</SectionTitle>
        <Muted style={{ marginBottom: spacing.md }}>Switch to renter mode with the same account. Your listing stays live.</Muted>
        <Button title={me?.has_renter_profile ? 'Switch to renter mode' : 'Find housing'} onPress={switchToRenter} />
      </Card>
      <Button title="Post another listing" variant="secondary" onPress={() => router.push('/onboarding/seller')} />
      <Button title="Log out" variant="ghost" onPress={async () => { await logout(); router.replace('/auth/login'); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 28, fontWeight: '800', color: colors.ink },
  photo: { width: 140, height: 100, borderRadius: 12, marginRight: 8, backgroundColor: colors.border },
  addPhoto: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.seller, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
});
