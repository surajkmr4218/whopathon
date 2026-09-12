import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { useCreateListing, useDashboard } from '@/api/hooks';
import type { ListingInput, Urgency } from '@/api/types';
import { RentAtRiskCard } from '@/components/SellerCards';
import { Button, Card, Chip, ChipRow, Input, Loading, Muted, Row, Screen, Stat } from '@/components/ui';
import { DATE_PRESETS, Label, StepNav, Steps, StepTitle } from '@/components/Wizard';
import { useAuth } from '@/state/auth';
import { CITY_FOR, colors, spacing, UNIVERSITIES, urgencyLabel } from '@/theme';
import { daysBetween, isValidISO, money } from '@/utils/dates';

const AMENITIES = ['WiFi included', 'AC', 'In-unit laundry', 'Washer/Dryer', 'Gym', 'Pool', 'Dishwasher', 'Balcony', 'Backyard', 'Utilities included'];
const STATE_FOR: Record<string, string> = { 'Ohio State': 'OH', Michigan: 'MI', Purdue: 'IN' };

export default function SellerOnboarding() {
  const router = useRouter();
  const { me, setMode, refresh } = useAuth();
  const create = useCreateListing();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [created, setCreated] = useState<{ id: number; compatible: number } | null>(null);
  const uni = me?.user.university ?? UNIVERSITIES[0];
  const [f, setF] = useState<ListingInput>({
    title: '', address: '', city: CITY_FOR[uni] ?? '', state: STATE_FOR[uni] ?? '', zip: '', university: uni, distance_miles: 0.8,
    housing_type: 'apartment', bedrooms: 1, bathrooms: 1, furnished: true, parking: false, roommates: 0, amenities: ['WiFi included'], description: '',
    available_from: DATE_PRESETS[0].from, available_until: DATE_PRESETS[0].until, monthly_rent: 1100, asking_price: 1050,
    utilities_cost: 50, parking_cost: 0, required_fees: 0, urgency: 'need_filled', accepts_partial: false, square_feet: 650,
  });
  const set = <K extends keyof ListingInput>(k: K, v: ListingInput[K]) => setF((s) => ({ ...s, [k]: v }));
  const num = (v: string) => Number(v.replace(/[^\d.]/g, '')) || 0;
  const datesOk = isValidISO(f.available_from) && isValidISO(f.available_until) && daysBetween(f.available_from, f.available_until) > 0;

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Photos', 'Allow photo access to add listing pictures.');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: true, selectionLimit: 3 });
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, 5));
  };

  const finish = async () => {
    try {
      const res = await create.mutateAsync(f);
      const id = res.listing.id;
      setCreated({ id, compatible: res.compatible_count });
      await setMode('seller');
      await refresh();
      setStep(6);
      // upload photos in the background; seeded stock photo is used if none
      for (const uri of photos) {
        try { await uploadFor(id, uri); } catch {}
      }
    } catch (e) {
      Alert.alert('Could not create listing', (e as Error).message);
    }
  };
  const uploadFor = async (id: number, uri: string) => {
    const form = new FormData();
    form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
    await api(`/listings/${id}/photos`, { method: 'POST', form });
  };

  if (step === 6 && created) return <LiveSummary listingId={created.id} compatible={created.compatible} onDone={() => router.replace('/(seller)/renters')} />;

  return (
    <Screen>
      <Steps step={step} total={6} color={colors.seller} />
      {step === 0 && (
        <>
          <StepTitle sub="Where is it and which campus is it near?">Your property</StepTitle>
          <Input label="Listing title" value={f.title} onChangeText={(v) => set('title', v)} placeholder="Sunny 1BR steps from campus" />
          <Input label="Address" value={f.address} onChangeText={(v) => set('address', v)} placeholder="123 College Ave" />
          <Row><View style={{ flex: 2 }}><Input label="City" value={f.city} onChangeText={(v) => set('city', v)} /></View>
            <View style={{ flex: 1 }}><Input label="State" value={f.state} onChangeText={(v) => set('state', v)} /></View>
            <View style={{ flex: 1 }}><Input label="ZIP" value={f.zip} onChangeText={(v) => set('zip', v)} keyboardType="number-pad" /></View></Row>
          <Label>Nearest university</Label>
          <ChipRow options={UNIVERSITIES} value={f.university} onChange={(u) => { set('university', u); set('city', CITY_FOR[u] ?? f.city); set('state', STATE_FOR[u] ?? f.state); }} color={colors.seller} />
          <Input label="Distance to campus (miles)" value={String(f.distance_miles)} onChangeText={(v) => set('distance_miles', num(v))} keyboardType="decimal-pad" />
        </>
      )}
      {step === 1 && (
        <>
          <StepTitle sub="These feed renters' preference scores.">Details</StepTitle>
          <Label>Type</Label>
          <ChipRow options={['room', 'apartment', 'house'] as const} value={f.housing_type} onChange={(v) => set('housing_type', v)} color={colors.seller} labels={{ room: 'Room', apartment: 'Apartment', house: 'House' }} />
          <Row><View style={{ flex: 1 }}><Input label="Bedrooms" value={String(f.bedrooms)} onChangeText={(v) => set('bedrooms', num(v))} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label="Bathrooms" value={String(f.bathrooms)} onChangeText={(v) => set('bathrooms', num(v))} keyboardType="decimal-pad" /></View>
            <View style={{ flex: 1 }}><Input label="Roommates" value={String(f.roommates)} onChangeText={(v) => set('roommates', num(v))} keyboardType="number-pad" /></View></Row>
          <Input label="Square feet (whole unit, or your room if subletting a room)" value={String(f.square_feet)} onChangeText={(v) => set('square_feet', num(v))} keyboardType="number-pad"
            hint="Used to compare your $/sqft with similar places nearby so renters see if it's a good deal." />
          <Row style={{ marginBottom: 12 }}>
            <Chip label={f.furnished ? '✓ Furnished' : 'Furnished'} selected={f.furnished} onPress={() => set('furnished', !f.furnished)} color={colors.seller} />
            <Chip label={f.parking ? '✓ Parking' : 'Parking'} selected={f.parking} onPress={() => set('parking', !f.parking)} color={colors.seller} />
          </Row>
          <Label>Amenities</Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {AMENITIES.map((a) => <Chip key={a} label={a} selected={f.amenities.includes(a)} color={colors.seller}
              onPress={() => set('amenities', f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a])} />)}
          </Row>
        </>
      )}
      {step === 2 && (
        <>
          <StepTitle sub="Optional — we'll use a stock photo if you skip this.">Photos</StepTitle>
          <Row style={{ flexWrap: 'wrap' }}>
            {photos.map((p) => <Image key={p} source={{ uri: p }} style={styles.thumb} />)}
            <Pressable onPress={pickPhoto} style={styles.addPhoto}><Text style={{ fontSize: 28, color: colors.seller }}>＋</Text></Pressable>
          </Row>
          <Input label="Description" value={f.description} onChangeText={(v) => set('description', v)} multiline placeholder="What makes your place great?" style={{ minHeight: 90 }} />
        </>
      )}
      {step === 3 && (
        <>
          <StepTitle sub="Every empty day is rent you can't get back.">Availability</StepTitle>
          <Row style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            {DATE_PRESETS.map((p) => <Chip key={p.label} label={p.label} color={colors.seller} selected={f.available_from === p.from && f.available_until === p.until} onPress={() => { set('available_from', p.from); set('available_until', p.until); }} />)}
          </Row>
          <Input label="Available from (YYYY-MM-DD)" value={f.available_from} onChangeText={(v) => set('available_from', v)} autoCapitalize="none" />
          <Input label="Available until (YYYY-MM-DD)" value={f.available_until} onChangeText={(v) => set('available_until', v)} autoCapitalize="none"
            hint={datesOk ? `${daysBetween(f.available_from, f.available_until)} days to fill` : 'Enter valid dates'} />
        </>
      )}
      {step === 4 && (
        <>
          <StepTitle sub="Your obligation drives Rent at Risk. Your asking price drives matches.">Costs & price</StepTitle>
          <Input label="Your monthly rent obligation ($)" value={String(f.monthly_rent)} onChangeText={(v) => set('monthly_rent', num(v))} keyboardType="number-pad" />
          <Input label="Asking sublease price ($/mo)" value={String(f.asking_price)} onChangeText={(v) => set('asking_price', num(v))} keyboardType="number-pad" />
          <Row><View style={{ flex: 1 }}><Input label="Utilities ($)" value={String(f.utilities_cost)} onChangeText={(v) => set('utilities_cost', num(v))} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label="Parking ($)" value={String(f.parking_cost)} onChangeText={(v) => set('parking_cost', num(v))} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label="Fees ($)" value={String(f.required_fees)} onChangeText={(v) => set('required_fees', num(v))} keyboardType="number-pad" /></View></Row>
          <Muted>Renters see true cost: {money(f.asking_price + f.utilities_cost + f.parking_cost + f.required_fees)}/mo</Muted>
        </>
      )}
      {step === 5 && (
        <>
          <StepTitle sub="Urgency changes how aggressively we suggest price cuts.">How urgent is it?</StepTitle>
          <ChipRow options={['normal', 'need_filled', 'urgent'] as Urgency[]} value={f.urgency} onChange={(v) => set('urgency', v)} labels={urgencyLabel} color={colors.seller} />
          <Card>
            <Text style={{ color: colors.ink, lineHeight: 20 }}>
              {f.urgency === 'normal' ? 'You can wait for the right renter.' : f.urgency === 'need_filled' ? 'You want to find someone soon.' : 'You are leaving soon and want to minimize vacancy loss.'}
            </Text>
          </Card>
          <Label>Partial fills</Label>
          <Row>
            <Chip label="Open to multiple renters" selected={f.accepts_partial} onPress={() => set('accepts_partial', true)} color={colors.seller} />
            <Chip label="One renter only" selected={!f.accepts_partial} onPress={() => set('accepts_partial', false)} color={colors.seller} />
          </Row>
        </>
      )}
      <StepNav step={step} total={6} color="seller" onBack={() => setStep((s) => s - 1)} busy={create.isPending}
        disabled={(step === 0 && (!f.title || !f.address)) || (step === 3 && !datesOk) || (step === 4 && (f.asking_price <= 0 || f.monthly_rent <= 0))}
        onNext={() => (step === 5 ? finish() : setStep((s) => s + 1))} nextLabel={step === 5 ? 'Publish listing' : undefined} />
    </Screen>
  );
}

function LiveSummary({ listingId, compatible, onDone }: { listingId: number; compatible: number; onDone: () => void }) {
  const dash = useDashboard(listingId);
  if (!dash.data) return <Loading />;
  const d = dash.data;
  return (
    <Screen>
      <Text style={styles.liveTitle}>Your listing is live 🎉</Text>
      <Muted style={{ marginBottom: spacing.lg }}>Here's what's at stake and who's already looking.</Muted>
      <RentAtRiskCard rentAtRisk={d.rent_at_risk} daily={d.daily_loss} vacancyDays={d.vacancy_days} daysToVacancy={d.days_to_vacancy} />
      <Card style={{ borderColor: colors.seller }}>
        <Row between>
          <Stat label="Compatible renters" value={String(compatible)} color={colors.seller} />
          <Stat label="Can afford your price" value={`${d.recovery.pct_can_afford}%`} />
        </Row>
        <Text style={{ marginTop: spacing.md, color: colors.ink, fontSize: 15 }}>
          {compatible} verified students are currently looking for a place like yours. Swipe to say who you'd rent to.
        </Text>
      </Card>
      <Button title="See matching renters" variant="seller" onPress={onDone} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 84, height: 84, borderRadius: 12, backgroundColor: colors.border },
  addPhoto: { width: 84, height: 84, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.seller, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  liveTitle: { fontSize: 28, fontWeight: '800', color: colors.ink },
});
