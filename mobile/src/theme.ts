export const colors = {
  bg: '#FAF8F5',
  card: '#FFFFFF',
  ink: '#141B2D',
  muted: '#6B7280',
  border: '#EAE6E1',
  accent: '#FF5A5F',
  accentSoft: '#FFE9EA',
  seller: '#0FA3B1',
  sellerSoft: '#E3F5F7',
  success: '#2FBF71',
  successSoft: '#E4F7EC',
  warning: '#F5A524',
  warningSoft: '#FFF3DC',
  danger: '#E5484D',
  navy: '#1F2A44',
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const levelColor: Record<string, string> = {
  'VERY HIGH': '#D93025',
  HIGH: colors.accent,
  MEDIUM: colors.warning,
  LOW: '#B8C0CC',
};

export const urgencyLabel: Record<string, string> = { normal: 'Normal', need_filled: 'Need It Filled', urgent: 'Urgent' };
export const flexibilityLabel: Record<string, string> = { exact: 'Exact dates', '3d': '± 3 days', '1w': '± 1 week', flexible: 'Flexible' };
export const UNIVERSITIES = ['Ohio State', 'Michigan', 'Purdue'];
export const CITY_FOR: Record<string, string> = { 'Ohio State': 'Columbus', Michigan: 'Ann Arbor', Purdue: 'West Lafayette' };
