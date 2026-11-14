import { MD3LightTheme } from 'react-native-paper';

export const Colors = {
  primary: '#1B5E20',
  primaryDark: '#0D3B12',
  secondary: '#8D6E63',
  background: '#F7F5EF',
  surface: '#FFFFFF',
  text: '#1C1B1F',
  muted: '#5F6368',
  border: '#DAD6CC',
  success: '#2E7D32',
  warning: '#EF6C00',
  error: '#C62828',
  unknown: '#6B7280',
  water: '#1565C0',
  soil: '#6D4C41',
};

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#D7E8D7',
    onPrimaryContainer: Colors.primaryDark,
    secondary: Colors.secondary,
    onSecondary: '#FFFFFF',
    background: Colors.background,
    onBackground: Colors.text,
    surface: Colors.surface,
    onSurface: Colors.text,
    surfaceVariant: '#EFECE4',
    onSurfaceVariant: Colors.muted,
    outline: Colors.border,
    error: Colors.error,
    onError: '#FFFFFF',
  },
};
