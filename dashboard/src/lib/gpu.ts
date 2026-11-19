export type GpuFamiliaNotebook = '5050' | '5060' | 'other';

/** Detecta família de GPU a partir da chave e/ou label. */
export function gpuFamiliaNotebook(chave: string, label = ''): GpuFamiliaNotebook {
  const t = `${chave} ${label}`.toLowerCase().replace(/\s+/g, '');
  if (t.includes('5060')) return '5060';
  if (t.includes('5050')) return '5050';
  return 'other';
}
