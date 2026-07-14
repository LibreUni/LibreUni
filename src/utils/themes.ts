export const THEMES = [
  {
    id: 'modern',
    label: 'Modern',
    description: 'Clear blue academic interface',
  },
  {
    id: 'scholar',
    label: 'Scholar',
    description: 'Warm serif reading mode',
  },
  {
    id: 'monochrome',
    label: 'Monochrome',
    description: 'Black-and-white square minimalism',
  },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const COLOR_MODES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'auto', label: 'Auto' },
] as const;

export type ColorMode = (typeof COLOR_MODES)[number]['id'];

export const DEFAULT_THEME_ID: ThemeId = 'monochrome';
export const DEFAULT_COLOR_MODE: ColorMode = 'auto';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEMES.some((theme) => theme.id === value);
}

export function getThemeById(value: unknown) {
  return THEMES.find((theme) => theme.id === value) ?? THEMES.find((theme) => theme.id === DEFAULT_THEME_ID)!;
}

export function isColorMode(value: unknown): value is ColorMode {
  return typeof value === 'string' && COLOR_MODES.some((mode) => mode.id === value);
}

export function resolveColorMode(mode: ColorMode, hour = new Date().getHours()) {
  return mode === 'auto' ? (hour >= 22 || hour < 7 ? 'dark' : 'light') : mode;
}
