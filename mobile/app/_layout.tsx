import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@/state/auth';
import { colors } from '@/theme';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } });

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              headerStyle: { backgroundColor: colors.bg },
              headerShadowVisible: false,
              headerTintColor: colors.ink,
              headerTitleStyle: { fontWeight: '700' },
              headerBackButtonDisplayMode: 'minimal',
            }}
          >
            <Stack.Screen name="listing/[id]" options={{ headerShown: true, title: 'Listing' }} />
            <Stack.Screen name="renter-profile/[id]" options={{ headerShown: true, title: 'Renter' }} />
            <Stack.Screen name="match/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Chat' }} />
            <Stack.Screen name="offer/[id]" options={{ headerShown: true, title: 'Offer' }} />
            <Stack.Screen name="partial-fill/[id]" options={{ headerShown: true, title: 'Partial fill' }} />
            <Stack.Screen name="demand" options={{ headerShown: true, title: 'Demand heatmap' }} />
            <Stack.Screen name="onboarding/renter" options={{ headerShown: true, title: 'Your preferences' }} />
            <Stack.Screen name="onboarding/review" options={{ headerShown: true, title: 'Review preferences' }} />
            <Stack.Screen name="rate/[id]" options={{ headerShown: true, title: 'Rate', presentation: 'modal' }} />
            <Stack.Screen name="onboarding/seller" options={{ headerShown: true, title: 'List your place' }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
