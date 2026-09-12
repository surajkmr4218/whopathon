import React from 'react';

import { MatchesList } from '@/components/MatchesList';
import { colors } from '@/theme';

export default function RenterMatches() {
  return <MatchesList title="Matches" accent={colors.accent} role="renter" />;
}
