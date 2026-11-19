export type ModuloDash = 'celular' | 'notebooks';

export function parseModulo(raw: string | null | undefined): ModuloDash {
  return raw === 'notebooks' ? 'notebooks' : 'celular';
}

export function labelModulo(modulo: ModuloDash): string {
  return modulo === 'notebooks' ? 'Notebooks' : 'Celulares';
}

export function subtituloModulo(modulo: ModuloDash): string {
  return modulo === 'notebooks'
    ? 'ASUS 16:10 · RTX 4060 / 5050 / 5060'
    : 'Xiaomi & Poco';
}

export function trackHint(modulo: ModuloDash): string {
  return modulo === 'notebooks' ? 'pnpm track:notebooks' : 'pnpm track:celular';
}
