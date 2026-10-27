import { useColorScheme } from 'react-native';

/** Calm by default; the warm "over" colour is the only loud one, kept for going past the target. */
const palette = {
  light: {
    bg: '#F4F2EE',
    surface: '#FFFFFF',
    surfaceAlt: '#ECE9E3',
    border: 'rgba(30,25,20,0.10)',
    text: '#1C1A17',
    textMuted: '#5F5A52',
    primary: '#3B5BDB',
    primaryText: '#FFFFFF',
    primarySoft: '#E3E8FB',
    good: '#2F7D4F',
    goodSoft: '#DFF1E5',
    over: '#C2410C',
    overSoft: '#FDE7DB',
    track: 'rgba(30,25,20,0.08)',
  },
  dark: {
    bg: '#121110',
    surface: '#1D1C1A',
    surfaceAlt: '#272522',
    border: 'rgba(255,250,240,0.10)',
    text: '#F2EFEA',
    textMuted: '#A8A298',
    primary: '#8DA2FB',
    primaryText: '#0E1330',
    primarySoft: '#252C4D',
    good: '#6CC58F',
    goodSoft: '#1D3326',
    over: '#FB923C',
    overSoft: '#3A2416',
    track: 'rgba(255,250,240,0.10)',
  },
};

export type Colors = (typeof palette)['light'];

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export function useTheme() {
  const dark = useColorScheme() === 'dark';
  return { colors: dark ? palette.dark : palette.light, dark };
}
