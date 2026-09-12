import { Redirect } from 'expo-router';
import React from 'react';

import { Loading } from '@/components/ui';
import { useAuth } from '@/state/auth';

export default function Index() {
  const { loading, token, me } = useAuth();
  if (loading) return <Loading />;
  if (!token || !me) return <Redirect href="/auth/login" />;
  const mode = me.user.mode;
  if (!mode) return <Redirect href="/onboarding/choose-mode" />;
  if (mode === 'renter') return <Redirect href={me.has_renter_profile ? '/(renter)/discover' : '/onboarding/renter'} />;
  return <Redirect href={me.listing_id ? '/(seller)/renters' : '/onboarding/seller'} />;
}
