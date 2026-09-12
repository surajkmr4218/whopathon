import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';

import { useProfile, useUpsertProfile } from '@/api/hooks';
import type { Flexibility, HousingType, Pref, RenterProfileInput } from '@/api/types';
import { Chip, ChipRow, Input, Row, Screen } from '@/components/ui';
import { DATE_PRESETS, Label, StepNav, Steps, StepTitle } from '@/components/Wizard';
import { useAuth } from '@/state/auth';
import { CITY_FOR, colors, flexibilityLabel, UNIVERSITIES } from '@/theme';
import { daysBetween, isValidISO } from '@/utils/dates';

const PREF: Pref[] = ['none', 'preferred', 'required'];
const PREF_LABEL = { none: "Don't care", preferred: 'Nice to have', required: 'Must have' };
const HOUSING: HousingType[] = ['any', 'room', 'apartment', 'house'];

export default function RenterOnboarding() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { me, setMode, refresh } = useAuth();
  const existing = useProfile();
  const save = useUpsertProfile();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<RenterProfileInput>({
    city: CITY_FOR[me?.user.university ?? ''] ?? '', university: me?.user.university ?? UNIVERSITIES[0], move_in: DATE_PRESETS[0].from, move_out: DATE_PRESETS[0].until,
    flexibility: '3d', max_budget: 1000, max_distance_miles: 1.5, furnished_pref: 'preferred', parking_pref: 'none', housing_type: 'any', roommates_ok: true,
  });
  const set = <K extends keyof RenterProfileInput>(k: K, v: RenterProfileInput[K]) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (edit && existing.data) {
      const { id: _id, user_id: _u, active: _a, ...rest } = existing.data;
      setF(rest);
    }
  }, [edit, existing.data]);

  const datesOk = isValidISO(f.move_in) && isValidISO(f.move_out) && daysBetween(f.move_in, f.move_out) > 0;

  const finish = async () => {
    try {
      await save.mutateAsync(f);
      await setMode('renter');
      await refresh();
      router.replace('/(renter)/discover');
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
    }
  };

  return (
    <Screen>
      <Steps step={step} total={4} />
      {step === 0 && (
        <>
          <StepTitle sub="We match around a campus so distance actually means something.">Where do you need to be?</StepTitle>
          <Label>University</Label>
          <ChipRow options={UNIVERSITIES} value={f.university} onChange={(u) => { set('university', u); set('city', CITY_FOR[u] ?? f.city); }} />
          <Input label="City" value={f.city} onChangeText={(v) => set('city', v)} />
        </>
      )}
      {step === 1 && (
        <>
          <StepTitle sub="Exact dates beat “summer housing”. We compare day by day.">When do you need a place?</StepTitle>
          <Row style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            {DATE_PRESETS.map((p) => <Chip key={p.label} label={p.label} selected={f.move_in === p.from && f.move_out === p.until} onPress={() => { set('move_in', p.from); set('move_out', p.until); }} />)}
          </Row>
          <Input label="Move in (YYYY-MM-DD)" value={f.move_in} onChangeText={(v) => set('move_in', v)} autoCapitalize="none" />
          <Input label="Move out (YYYY-MM-DD)" value={f.move_out} onChangeText={(v) => set('move_out', v)} autoCapitalize="none"
            hint={datesOk ? `${daysBetween(f.move_in, f.move_out)} days` : 'Enter valid dates, move-out after move-in'} />
          <Label>Date flexibility</Label>
          <ChipRow options={['exact', '3d', '1w', 'flexible'] as Flexibility[]} value={f.flexibility} onChange={(v) => set('flexibility', v)} labels={flexibilityLabel} />
        </>
      )}
      {step === 2 && (
        <>
          <StepTitle sub="We compare true monthly cost (rent + utilities + fees), not just rent.">What's your budget?</StepTitle>
          <Input label="Max monthly budget ($)" value={String(f.max_budget)} onChangeText={(v) => set('max_budget', Number(v.replace(/\D/g, '')) || 0)} keyboardType="number-pad" />
          <Label>Max distance from campus</Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {[0.5, 1, 1.5, 2, 3, 5].map((d) => <Chip key={d} label={`${d} mi`} selected={f.max_distance_miles === d} onPress={() => set('max_distance_miles', d)} />)}
          </Row>
        </>
      )}
      {step === 3 && (
        <>
          <StepTitle sub="Must-haves count more than nice-to-haves in your match score.">Preferences</StepTitle>
          <Label>Furnished</Label>
          <ChipRow options={PREF} value={f.furnished_pref} onChange={(v) => set('furnished_pref', v)} labels={PREF_LABEL} />
          <Label>Parking</Label>
          <ChipRow options={PREF} value={f.parking_pref} onChange={(v) => set('parking_pref', v)} labels={PREF_LABEL} />
          <Label>Housing type</Label>
          <ChipRow options={HOUSING} value={f.housing_type} onChange={(v) => set('housing_type', v)} labels={{ any: 'Any', room: 'Room', apartment: 'Apartment', house: 'House' }} />
          <Label>Roommates</Label>
          <Row>
            <Chip label="Okay with roommates" selected={f.roommates_ok} onPress={() => set('roommates_ok', true)} />
            <Chip label="No roommates" selected={!f.roommates_ok} onPress={() => set('roommates_ok', false)} />
          </Row>
        </>
      )}
      <StepNav step={step} total={4} onBack={() => setStep((s) => s - 1)} busy={save.isPending}
        disabled={(step === 1 && !datesOk) || (step === 2 && f.max_budget <= 0)}
        onNext={() => (step === 3 ? finish() : setStep((s) => s + 1))} nextLabel={step === 3 ? (edit ? 'Save preferences' : 'Start swiping') : undefined} />
      {step === 3 ? <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 12 }}>You can edit these anytime from your profile.</Text> : null}
    </Screen>
  );
}
