export type ModuloDash = 'celular' | 'notebooks';

export function parseModulo(raw: string | null | undefined): ModuloDash {
  return raw === 'notebooks' ? 'notebooks' : 'celular';
}

export function labelModulo(modulo: ModuloDash): string {
  return modulo === 'notebooks' ? 'Notebooks' : 'Celulares';
}

export function subtituloModulo(modulo: ModuloDash): string {
  return modulo === 'notebooks'
    ? 'Foco 4K TV · RTX 5060 / 5050 / 4060 · até R$ 9.000'
    : 'Xiaomi & Poco';
}

export function trackHint(modulo: ModuloDash): string {
  return modulo === 'notebooks' ? 'pnpm track:notebooks' : 'pnpm track:celular';
}
