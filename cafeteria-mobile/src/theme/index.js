// src/theme/index.js
// Centralized design system — colors, typography, spacing, shadows

export const Colors = {
  // Brand
  primary: '#1B5E20',        // deep forest green
  primaryLight: '#2E7D32',
  primaryDark: '#0A3D10',
  accent: '#E65100',         // warm orange
  accentLight: '#FF6D00',
  accentSoft: '#FFF3E0',

  // Backgrounds
  background: '#F8F5F0',     // soft ivory
  surface: '#FFFFFF',
  surfaceAlt: '#F1EDE7',

  // Text
  textPrimary: '#1A1A2E',    // dark charcoal
  textSecondary: '#6B7280',  // muted grey
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  textAccent: '#E65100',

  // Semantic
  success: '#1B8A4B',
  successLight: '#E8F5E9',
  successBorder: '#A5D6A7',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  warningBorder: '#FCD34D',
  error: '#C62828',
  errorLight: '#FFEBEE',
  errorBorder: '#EF9A9A',
  info: '#1565C0',
  infoLight: '#E3F2FD',

  // Order Status
  statusReceived: '#1565C0',
  statusPreparing: '#D97706',
  statusReady: '#1B8A4B',
  statusCompleted: '#6B7280',
  statusCancelled: '#C62828',

  // UI
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#F0EDE8',
  overlay: 'rgba(0,0,0,0.5)',
  shadow: '#000000',

  // Category chips
  chipBackground: '#F0EDE8',
  chipActive: '#1B5E20',
  chipTextActive: '#FFFFFF',
};

export const Typography = {
  // Font families (system fonts)
  fontRegular: 'System',
  fontMedium: 'System',
  fontBold: 'System',

  // Font sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 34,

  // Line heights
  lineHeightSm: 18,
  lineHeightBase: 22,
  lineHeightMd: 26,
  lineHeightLg: 30,

  // Font weights
  weightRegular: '400',
  weightMedium: '500',
  weightSemiBold: '600',
  weightBold: '700',
  weightExtraBold: '800',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  screen: 16,    // standard horizontal screen padding
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const IconSize = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
};

// Status helpers
export const getStatusColor = (status) => {
  switch (status) {
    case 'Received':  return Colors.statusReceived;
    case 'Preparing': return Colors.statusPreparing;
    case 'Ready':     return Colors.statusReady;
    case 'Completed': return Colors.statusCompleted;
    case 'Cancelled': return Colors.statusCancelled;
    default:          return Colors.textSecondary;
  }
};

export const getStatusBackground = (status) => {
  switch (status) {
    case 'Received':  return Colors.infoLight;
    case 'Preparing': return Colors.warningLight;
    case 'Ready':     return Colors.successLight;
    case 'Completed': return '#F3F4F6';
    case 'Cancelled': return Colors.errorLight;
    default:          return Colors.borderLight;
  }
};

export const getStatusLabel = (status) => {
  switch (status) {
    case 'Received':  return 'Order Received';
    case 'Preparing': return 'Being Prepared';
    case 'Ready':     return 'Ready for Pickup';
    case 'Completed': return 'Completed';
    case 'Cancelled': return 'Cancelled';
    default:          return status;
  }
};

export default {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadows,
  IconSize,
  getStatusColor,
  getStatusBackground,
  getStatusLabel,
};

