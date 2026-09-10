import { Platform } from 'react-native';

export const THEME = {
  colors: {
    // Brand & Accents
    brand: '#FFB380',
    brandLight: '#FFF4ED',
    brandDark: '#E28B50',
    brandHover: '#F5A066',

    // Ink / Monochrome Foundation
    ink: '#0D0D11',
    inkLight: '#18181F',
    inkSubtle: '#272732',

    // Canvas Surfaces
    canvas: '#F6F5F2',
    canvasSubtle: '#F0F0EC',
    white: '#FFFFFF',

    // Text hierarchy
    textPrimary: '#0D0D11',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textLight: '#FFFFFF',

    // Status Semantic
    success: '#10B981',
    successLight: '#E8F8EE',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',

    // Borderless by default (Zero Hairline Borders)
    border: 'transparent',
    divider: '#EBEBE6',
  },

  roundness: {
    pill: 9999,
    card: 28,
    cardLg: 32,
    sm: 14,
    xs: 8,
  },

  typography: {
    fontFamily: {
      // Main Font: Nunito (Headings, Display, Brand, Hero, Buttons)
      main: 'Nunito_700Bold',
      mainRegular: 'Nunito_400Regular',
      mainMedium: 'Nunito_600SemiBold',
      mainBold: 'Nunito_700Bold',
      mainExtraBold: 'Nunito_800ExtraBold',
      mainBlack: 'Nunito_900Black',
      display: 'Nunito_800ExtraBold',
      displayExtraBold: 'Nunito_900Black',

      // Secondary Font: Geist Sans (Body, Subtitles, Inputs, Descriptions, Captions)
      secondary: 'Geist-Regular',
      secondaryRegular: 'Geist-Regular',
      secondaryMedium: 'Geist-Medium',
      secondarySemiBold: 'Geist-SemiBold',
      secondaryBold: 'Geist-Bold',

      // Semantic shortcuts
      body: 'Geist-Regular',
      bodyMedium: 'Geist-Medium',
      bodyBold: 'Geist-SemiBold',
    },
    tracking: {
      tight: -0.5,
      tighter: -0.8,
    },
  },
};

export default THEME;
