import { gpuFamiliaNotebook, type GpuFamiliaNotebook } from '@/lib/gpu';

export type SerieNotebook = 'f16' | 'a16';

export type ClassificacaoNotebook = {
  serie: SerieNotebook | null;
  gpu: GpuFamiliaNotebook;
};

/** Classifica SKU/label em série F16/A16 + família de GPU. */
export function classificarNotebook(chave: string, label = ''): ClassificacaoNotebook {
  const t = `${chave} ${label}`.toLowerCase();
  const gpu = gpuFamiliaNotebook(chave, label);

  let serie: SerieNotebook | null = null;
  if (
    /\bf16\b/.test(t) ||
    /\bfx608/.test(t) ||
    /\bfx607/.test(t) ||
    chave.startsWith('f16_') ||
    /^fx608|^fx607/.test(chave)
  ) {
    serie = 'f16';
  } else if (
    /\ba16\b/.test(t) ||
    /\bfa607/.test(t) ||
    chave.startsWith('a16_') ||
    /^fa607/.test(chave)
  ) {
    serie = 'a16';
  }

  return { serie, gpu };
}

export function ehNotebookPermitido(chave: string, label = ''): boolean {
  return classificarNotebook(chave, label).serie != null;
}
