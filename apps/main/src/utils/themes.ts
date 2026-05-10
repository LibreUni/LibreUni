export const THEMES = [
  {
    id: 'dark',
    label: 'Dark',
    description: 'Low-glare slate interface',
    prefersDark: true,
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Clean daylight interface',
    prefersDark: false,
  },
  {
    id: 'scholar',
    label: 'Scholar',
    description: 'Warm serif reading mode',
    prefersDark: false,
  },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const DEFAULT_THEME_ID: ThemeId = 'dark';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEMES.some((theme) => theme.id === value);
}

export function getThemeById(value: unknown) {
  return THEMES.find((theme) => theme.id === value) ?? THEMES.find((theme) => theme.id === DEFAULT_THEME_ID)!;
}
