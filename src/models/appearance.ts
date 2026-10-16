import type { CSSProperties } from 'react';
import { z } from 'zod';

const color = z.string().regex(/^#[a-f\d]{6}$/i);
export const DEFAULT_BAR_COLORS = { header: '#ffffff', tools: '#ffffff' };
const barColorsSchema = z.object({ header: color, tools: color });
export type BarColors = z.infer<typeof barColorsSchema>;
export const parseBarColors = (value: unknown): BarColors => barColorsSchema.safeParse(value).data ?? { ...DEFAULT_BAR_COLORS };

// Pick the higher-contrast foreground, including when the app uses the dark theme.
function foreground(background: string) {
  const [r, g, b] = [1, 3, 5].map(offset => {
    const channel = parseInt(background.slice(offset, offset + 2), 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  const luminance = .2126 * r + .7152 * g + .0722 * b;
  return (luminance + .05) / .05 >= 1.05 / (luminance + .05) ? '#111111' : '#ffffff';
}
export function barColorStyle(colors: BarColors): CSSProperties {
  const headerInk = foreground(colors.header), toolsInk = foreground(colors.tools);
  return {
    '--header-background': colors.header, '--header-ink': headerInk,
    '--header-hover': headerInk === '#ffffff' ? '#ffffff26' : '#0000000d',
    '--tools-background': colors.tools, '--tools-ink': toolsInk,
    '--tools-hover': toolsInk === '#ffffff' ? '#ffffff26' : '#0000000d',
  } as CSSProperties;
}
