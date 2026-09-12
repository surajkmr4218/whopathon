import React from 'react';

import { MatchesList } from '@/components/MatchesList';
import { colors } from '@/theme';

export default function SellerMatches() {
  return <MatchesList title="Matches" accent={colors.seller} role="seller" />;
}
