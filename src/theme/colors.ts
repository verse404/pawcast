import { Platform, ViewStyle } from 'react-native';
import { PawSafetyTier, WalkQualityTier } from '../types/walk';

export const UI_FONT_FAMILY = Platform.select({
  web: "'Google Sans Flex', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  default: undefined,
});

export const COLORS = {
  background: '#F6F5F0',
  desktopBackdrop: '#E7E5DD',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#ECEBE3',
  surfaceBotanical: '#EAF3EE',
  border: '#E3E1D8',
  borderSubtle: '#ECEAE2',

  textPrimary: '#10231C',
  textSecondary: '#43554D',
  textMuted: '#55665E',

  brand: '#166345',
  brandVibrant: '#197552',
  brandLight: '#E1F3EB',
  brandSoft: '#EEF7F3',
  brandDark: '#0F4731',

  idealBg: '#E2F4EC',
  idealText: '#115E3E',
  idealAccent: '#14704A',
  idealBorder: '#B6E3CE',

  goodBg: '#ECF5E3',
  goodText: '#2B5613',
  goodAccent: '#3A7019',
  goodBorder: '#C7E3B4',

  cautionBg: '#FDF2DA',
  cautionText: '#8F5105',
  cautionAccent: '#9E5404',
  cautionBorder: '#F6D592',

  avoidBg: '#FCE8E6',
  avoidText: '#9E221E',
  avoidAccent: '#D63630',
  avoidBorder: '#F6BDBA',

  goldenBg: '#FFF3D6',
  goldenText: '#8C5000',

  rainAccent: '#2563EB',
  rainText: '#1D4ED8',
  rainBg: '#E8F0FE',
  rainBorder: '#BFDBFE',

  heartBg: '#FDECEE',
  heartAccent: '#D92D4B',
};

export const ELEVATION: Record<
  'card' | 'cardHero' | 'floating' | 'pin' | 'phoneFrame' | 'tabBar',
  ViewStyle
> = {
  card: Platform.select<ViewStyle>({
    web: {
      boxShadow:
        '0 2px 6px rgba(16, 35, 28, 0.04), 0 10px 24px rgba(16, 35, 28, 0.05)',
    } as ViewStyle,
    default: {
      shadowColor: '#10231C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
  }),
  cardHero: Platform.select<ViewStyle>({
    web: {
      boxShadow:
        '0 4px 12px rgba(22, 99, 69, 0.07), 0 14px 30px rgba(16, 35, 28, 0.07)',
    } as ViewStyle,
    default: {
      shadowColor: '#10231C',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.09,
      shadowRadius: 16,
      elevation: 4,
    },
  }),
  floating: Platform.select<ViewStyle>({
    web: {
      boxShadow:
        '0 6px 18px rgba(16, 35, 28, 0.11), 0 2px 5px rgba(16, 35, 28, 0.06)',
    } as ViewStyle,
    default: {
      shadowColor: '#10231C',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 16,
      elevation: 6,
    },
  }),
  pin: Platform.select<ViewStyle>({
    web: {
      boxShadow: '0 3px 10px rgba(16, 35, 28, 0.22)',
    } as ViewStyle,
    default: {
      shadowColor: '#10231C',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.22,
      shadowRadius: 6,
      elevation: 4,
    },
  }),
  phoneFrame: Platform.select<ViewStyle>({
    web: {
      boxShadow:
        '0 24px 64px rgba(16, 35, 28, 0.18), 0 4px 16px rgba(16, 35, 28, 0.08)',
    } as ViewStyle,
    default: {
      shadowColor: '#10231C',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.18,
      shadowRadius: 32,
      elevation: 10,
    },
  }),
  tabBar: Platform.select<ViewStyle>({
    web: {
      boxShadow: '0 -4px 20px rgba(16, 35, 28, 0.05)',
    } as ViewStyle,
    default: {
      shadowColor: '#10231C',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 6,
    },
  }),
};

export function getQualityColors(tier: WalkQualityTier): {
  bg: string;
  text: string;
  accent: string;
} {
  switch (tier) {
    case 'ideal':
      return {
        bg: COLORS.idealBg,
        text: COLORS.idealText,
        accent: COLORS.idealAccent,
      };
    case 'good':
      return {
        bg: COLORS.goodBg,
        text: COLORS.goodText,
        accent: COLORS.goodAccent,
      };
    case 'caution':
      return {
        bg: COLORS.cautionBg,
        text: COLORS.cautionText,
        accent: COLORS.cautionAccent,
      };
    case 'avoid':
      return {
        bg: COLORS.avoidBg,
        text: COLORS.avoidText,
        accent: COLORS.avoidAccent,
      };
  }
}

export function getPawColors(tier: PawSafetyTier): {
  bg: string;
  text: string;
  accent: string;
} {
  switch (tier) {
    case 'safe':
      return {
        bg: COLORS.idealBg,
        text: COLORS.idealText,
        accent: COLORS.idealAccent,
      };
    case 'warm':
      return {
        bg: COLORS.cautionBg,
        text: COLORS.cautionText,
        accent: COLORS.cautionAccent,
      };
    case 'hot':
      return {
        bg: '#FDE9DC',
        text: '#A84308',
        accent: '#E05A10',
      };
    case 'danger':
      return {
        bg: COLORS.avoidBg,
        text: COLORS.avoidText,
        accent: COLORS.avoidAccent,
      };
  }
}
