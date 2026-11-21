export type GpuFamiliaNotebook = '5060' | '5050' | '4060' | 'other';

/** Detecta família de GPU a partir da chave e/ou label. */
export function gpuFamiliaNotebook(chave: string, label = ''): GpuFamiliaNotebook {
  const t = `${chave} ${label}`.toLowerCase().replace(/\s+/g, '');
  if (t.includes('5060')) return '5060';
  if (t.includes('5050')) return '5050';
  if (t.includes('4060')) return '4060';
  return 'other';
}
