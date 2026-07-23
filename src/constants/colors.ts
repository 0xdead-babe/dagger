export const TAG_COLORS = [
  { name: 'clay', hex: '#C9703F' },
  { name: 'amber', hex: '#D9A441' },
  { name: 'sage', hex: '#8FA876' },
  { name: 'teal', hex: '#4FA8A0' },
  { name: 'dusty blue', hex: '#6E8FC7' },
  { name: 'lavender', hex: '#9B87C4' },
  { name: 'rose', hex: '#C97A9E' },
  { name: 'ember', hex: '#C4553A' },
  { name: 'moss', hex: '#7A8F5C' },
  { name: 'stone', hex: '#9C9184' },
] as const;

export const TAG_COLOR_HEXES = TAG_COLORS.map(c => c.hex);
