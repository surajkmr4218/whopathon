import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import type {
  Dashboard, DemandReport, Listing, ListingCardData, ListingInput, MatchSummary, Message, Offer, PartialFillOption,
  PublicUser, Rating, RatingSummary, RenterCardData, RenterProfile, RenterProfileInput, SwipeResult, UserRatings,
} from './types';

// ---- renter ----
export const useProfile = () => useQuery({ queryKey: ['profile'], queryFn: () => api<RenterProfile>('/renter/profile'), retry: false });

export function useUpsertProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RenterProfileInput) => api<RenterProfile>('/renter/profile', { method: 'PUT', body }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export const useDiscover = () => useQuery({ queryKey: ['discover'], queryFn: () => api<ListingCardData[]>('/renter/discover') });
export const useSaved = () => useQuery({ queryKey: ['saved'], queryFn: () => api<ListingCardData[]>('/renter/saved') });

export function useToggleSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, saved }: { listingId: number; saved: boolean }) =>
      api(`/renter/saved/${listingId}`, { method: saved ? 'DELETE' : 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved'] }),
  });
}

export const useListing = (id: number) =>
  useQuery({ queryKey: ['listing', id], queryFn: () => api<ListingCardData>(`/listings/${id}`), enabled: Number.isFinite(id) });

// ---- swipes / matches ----
export function useSwipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { listing_id: number; renter_id?: number; direction: 'like' | 'pass' }) =>
      api<SwipeResult>('/swipes', { method: 'POST', body }),
    onSuccess: (res) => {
      if (res.match) qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export const useMatches = () => useQuery({ queryKey: ['matches'], queryFn: () => api<MatchSummary[]>('/matches') });
export const useMatch = (id: number) => useQuery({ queryKey: ['match', id], queryFn: () => api<MatchSummary>(`/matches/${id}`) });

export const useMessages = (matchId: number) =>
  useQuery({ queryKey: ['messages', matchId], queryFn: () => api<Message[]>(`/matches/${matchId}/messages`), refetchInterval: 3000 });

export function useSendMessage(matchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api<Message>(`/matches/${matchId}/messages`, { method: 'POST', body: { body } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', matchId] });
      qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export const useOffers = (matchId: number) =>
  useQuery({ queryKey: ['offers', matchId], queryFn: () => api<Offer[]>(`/matches/${matchId}/offers`), refetchInterval: 4000 });

export function useCreateOffer(matchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { monthly_price: number; start_date: string; end_date: string }) =>
      api<Offer>(`/matches/${matchId}/offers`, { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers', matchId] });
      qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useRespondOffer(matchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, ...body }: { offerId: number; action: 'accept' | 'reject' | 'counter'; monthly_price?: number; start_date?: string; end_date?: string }) =>
      api<Offer>(`/offers/${offerId}/respond`, { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers', matchId] });
      qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useRateMatch(matchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { stars: number; comment: string }) => api<{ rating: Rating; summary: RatingSummary }>(`/matches/${matchId}/rating`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export const useUserRatings = (id: number) => useQuery({ queryKey: ['userRatings', id], queryFn: () => api<UserRatings>(`/users/${id}/ratings`) });

export const useUser = (id: number) => useQuery({ queryKey: ['user', id], queryFn: () => api<PublicUser>(`/users/${id}`) });

// ---- seller ----
export const useMyListings = () => useQuery({ queryKey: ['myListings'], queryFn: () => api<ListingCardData[]>('/listings/mine') });

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ListingInput) => api<ListingCardData & { compatible_count: number }>('/listings', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useUpdateListing(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Listing>) => api<ListingCardData>(`/listings/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useUploadPhoto(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uri: string) => {
      const form = new FormData();
      const name = uri.split('/').pop() ?? 'photo.jpg';
      // React Native's FormData accepts {uri, name, type}
      form.append('file', { uri, name, type: 'image/jpeg' } as unknown as Blob);
      return api<{ url: string }>(`/listings/${id}/photos`, { method: 'POST', form });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export const useRenters = (listingId: number | null) =>
  useQuery({
    queryKey: ['renters', listingId],
    queryFn: () => api<{ count: number; cards: RenterCardData[] }>(`/listings/${listingId}/renters`),
    enabled: listingId != null,
  });

export const useDashboard = (listingId: number | null) =>
  useQuery({ queryKey: ['dashboard', listingId], queryFn: () => api<Dashboard>(`/listings/${listingId}/dashboard`), enabled: listingId != null });

export function useApplyPrice(listingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (price: number) => api<ListingCardData>(`/listings/${listingId}/apply-price`, { method: 'POST', body: { price } }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export const usePartialFill = (listingId: number) =>
  useQuery({ queryKey: ['partialFill', listingId], queryFn: () => api<{ listing: Listing; options: PartialFillOption[] }>(`/listings/${listingId}/partial-fill`) });

export const useDemand = (params: { university?: string; listingId?: number | null }) => {
  const q = new URLSearchParams();
  if (params.university) q.set('university', params.university);
  if (params.listingId != null) q.set('listing_id', String(params.listingId));
  return useQuery({ queryKey: ['demand', params], queryFn: () => api<DemandReport>(`/demand?${q.toString()}`) });
};
