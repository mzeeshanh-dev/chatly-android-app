/**
 * Single source of truth for Chatly's color tokens, ported 1:1 from the web
 * app's src/styles/globals.css so the mobile app is visually identical in
 * both the "Solar Light" and "Deep Tech Dark" profiles.
 */
export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  bubbleReceivedBg: string;
  bubbleReceivedText: string;
  bubbleReceivedBorder: string;
}

export const lightColors: ThemeColors = {
  background: '#f8fafc',
  foreground: '#0f172a',
  primary: '#10b981',
  primaryForeground: '#ffffff',
  secondary: '#f1f5f9',
  secondaryForeground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  accent: '#10b981',
  accentForeground: '#ffffff',
  border: '#e2e8f0',
  input: '#e2e8f0',
  ring: '#10b981',
  bubbleReceivedBg: '#ffffff',
  bubbleReceivedText: '#0f172a',
  bubbleReceivedBorder: '#e2e8f0',
};

export const darkColors: ThemeColors = {
  background: '#0b0c10',
  foreground: '#f1f5f9',
  primary: '#10b981',
  primaryForeground: '#0b0c10',
  secondary: '#11131a',
  secondaryForeground: '#f1f5f9',
  muted: '#1e2230',
  mutedForeground: '#94a3b8',
  accent: '#10b981',
  accentForeground: '#ffffff',
  border: 'rgba(255,255,255,0.06)',
  input: '#161922',
  ring: '#10b981',
  bubbleReceivedBg: '#1a1d28',
  bubbleReceivedText: '#e4e4e7',
  bubbleReceivedBorder: 'rgba(255,255,255,0.04)',
};

// Shared across both themes
export const sharedColors = {
  bubbleSent: '#059669', // emerald-600
  tickRead: '#3dfc82',
  tickSent: 'rgba(255,255,255,0.5)',
  danger: '#ef4444',
  online: '#10b981',
};

export type ThemeMode = 'light' | 'dark';

export function getColors(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? darkColors : lightColors;
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };

export const spacing = (n: number) => n * 4;
