import { gpuFamiliaNotebook, type GpuFamiliaNotebook } from './gpu';

export type MarcaNotebook =
  | 'ASUS'
  | 'Avell'
  | 'Lenovo'
  | 'Acer'
  | 'Dell'
  | 'Alienware'
  | 'Gigabyte'
  | 'Outro';

export type SerieNotebook =
  | 'tuf-f16'
  | 'tuf-a16'
  | 'avell-storm'
  | 'avell-ion'
  | 'lenovo-loq'
  | 'acer-nitro'
  | 'asus-v16'
  | 'dell-g15'
  | 'dell-g16'
  | 'alienware-m16'
  | 'alienware-x16'
  | 'gigabyte-aorus'
  | 'gigabyte-g6';

export type CategoriaTgp = 'full_power' | 'balanceado' | 'slim_reduzido';

export type ClassificacaoNotebook = {
  serie: SerieNotebook | null;
  marca: MarcaNotebook;
  linhaLabel: string;
  gpu: GpuFamiliaNotebook;
  tgpWatts: number;
  categoriaTgp: CategoriaTgp;
  suporta4k120Hz: boolean;
};

/** Teto de chassi TUF antes do clamp por GPU. */
const TGP_CHASSI_TUF = 140;

/**
 * TGP efetivo = min(chassi, teto da GPU).
 * RTX 5050/5060/4060 no TUF: 115W (100W + 15W Dynamic Boost) — NÃO 140W.
 */
export function tgpEfetivoNotebook(tgpChassi: number, gpu: GpuFamiliaNotebook): number {
  if (gpu === '5060' || gpu === '5050' || gpu === '4060') {
    return Math.min(tgpChassi, 115);
  }
  return tgpChassi;
}

/** Full Power só a partir de 110W (estável para 4K sem VRR). */
export function categoriaTgpPorWatts(tgpWatts: number): CategoriaTgp {
  if (tgpWatts >= 110) return 'full_power';
  if (tgpWatts >= 85) return 'balanceado';
  return 'slim_reduzido';
}

/**
 * ASUS premium fora do pódio padrão (Strix / Zephyrus / TUF G16).
 * Dell G16 / Alienware m16 NÃO entram aqui — são premium filtráveis no dash.
 */
const SERIE_FORA_ESCOPO_DASH =
  /(?:\brog\s*strix\b|\bstrix\s*g\s*16\b|\bzephyrus\b|\btuf\s*gaming\s*[gm]\s*16\b|\bg614\b|\bg615\b|\bg634\b|\bgu604\b|\bgu605\b|\bgu606\b)/i;

/** Chaves ASUS-style sem prefixo dell_/alienware_. */
const CHAVE_FORA_ESCOPO_DASH = /^(g16|m16|g614|g615|g634|g814|gu604|gu605|gu606)([_-]|$)/i;

function ehDellAlienOuGigabyteDash(chave: string, label: string): boolean {
  if (/^(dell_|alienware_|gigabyte_)/i.test(chave)) return true;
  return /\b(dell|alienware|gigabyte|aorus)\b/i.test(`${chave} ${label}`);
}

function ehForaEscopoDash(chave: string, label: string): boolean {
  if (CHAVE_FORA_ESCOPO_DASH.test(chave)) return true;
  const t = `${chave} ${label}`;
  if (SERIE_FORA_ESCOPO_DASH.test(t)) return true;
  if (
    !ehDellAlienOuGigabyteDash(chave, label) &&
    /\b(?:asus|rog|tuf)\b/i.test(t) &&
    /\b[gm]\s*16\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

function montar(
  partial: Omit<ClassificacaoNotebook, 'tgpWatts' | 'categoriaTgp'> & { tgpChassi: number }
): ClassificacaoNotebook {
  const tgpWatts = tgpEfetivoNotebook(partial.tgpChassi, partial.gpu);
  return {
    serie: partial.serie,
    marca: partial.marca,
    linhaLabel: partial.linhaLabel,
    gpu: partial.gpu,
    tgpWatts,
    categoriaTgp: categoriaTgpPorWatts(tgpWatts),
    suporta4k120Hz: partial.suporta4k120Hz,
  };
}

/** Marcas que não disputam o pódio 4K (filtro Premium). */
export function ehMarcaPremium(marca: MarcaNotebook): boolean {
  return marca === 'Dell' || marca === 'Alienware' || marca === 'Gigabyte';
}

/** Acima do teto de orçamento 4K (R$ 9.000). */
export function foraDoOrcamento(preco: number | null | undefined, teto = 9000): boolean {
  return preco != null && Number.isFinite(preco) && preco > teto;
}

/** Premium de marca ou preço acima do teto. */
export function ehProdutoPremium(
  marca: MarcaNotebook,
  preco: number | null | undefined,
  teto = 9000
): boolean {
  return ehMarcaPremium(marca) || foraDoOrcamento(preco, teto);
}

/** Classifica SKU/label em marca, série, TGP efetivo e família de GPU. */
export function classificarNotebook(chave: string, label = ''): ClassificacaoNotebook {
  const t = `${chave} ${label}`.toLowerCase();
  const gpu = gpuFamiliaNotebook(chave, label);

  // 1. Avell Storm 560
  if (/storm[\s\-]*560|storm560/i.test(t) || chave.includes('storm560')) {
    return montar({
      serie: 'avell-storm',
      marca: 'Avell',
      linhaLabel: 'Avell Storm 560',
      gpu,
      tgpChassi: 115,
      suporta4k120Hz: true,
    });
  }

  // 2. Avell ION A70
  if (/ion\s*a70|iona70/i.test(t) || chave.includes('iona70')) {
    return montar({
      serie: 'avell-ion',
      marca: 'Avell',
      linhaLabel: 'Avell ION A70',
      gpu,
      tgpChassi: 115,
      suporta4k120Hz: true,
    });
  }

  // 3. Lenovo LOQ 15 / 16
  if (/loq/i.test(t) || chave.startsWith('loq_')) {
    const is16 = /16/i.test(chave) || /loq\s*16/i.test(t);
    return montar({
      serie: 'lenovo-loq',
      marca: 'Lenovo',
      linhaLabel: is16 ? 'Lenovo LOQ 16' : 'Lenovo LOQ 15',
      gpu,
      tgpChassi: 115,
      suporta4k120Hz: true,
    });
  }

  // 4. Acer Nitro V16
  if (/nitro\s*v16|anv16/i.test(t) || chave.startsWith('anv16')) {
    return montar({
      serie: 'acer-nitro',
      marca: 'Acer',
      linhaLabel: 'Acer Nitro V16',
      gpu,
      tgpChassi: 95,
      suporta4k120Hz: true,
    });
  }

  // 5. Dell G16 / G15
  if (/dell_g16|dell\s+g\s*16/i.test(t) || chave.startsWith('dell_g16')) {
    return montar({
      serie: 'dell-g16',
      marca: 'Dell',
      linhaLabel: 'Dell G16',
      gpu,
      tgpChassi: 115,
      suporta4k120Hz: true,
    });
  }
  if (/dell_g15|dell\s+g\s*15/i.test(t) || chave.startsWith('dell_g15')) {
    return montar({
      serie: 'dell-g15',
      marca: 'Dell',
      linhaLabel: 'Dell G15',
      gpu,
      tgpChassi: 105,
      suporta4k120Hz: false,
    });
  }

  // 6. Alienware m16 / x16
  if (/alienware_m16|alienware\s+m\s*16/i.test(t) || chave.startsWith('alienware_m16')) {
    return montar({
      serie: 'alienware-m16',
      marca: 'Alienware',
      linhaLabel: 'Alienware m16',
      gpu,
      tgpChassi: 140,
      suporta4k120Hz: true,
    });
  }
  if (/alienware_x16|alienware\s+x\s*16/i.test(t) || chave.startsWith('alienware_x16')) {
    return montar({
      serie: 'alienware-x16',
      marca: 'Alienware',
      linhaLabel: 'Alienware x16',
      gpu,
      tgpChassi: 140,
      suporta4k120Hz: true,
    });
  }

  // 7. Gigabyte AORUS 16 / A16 / G6 (antes do ASUS A16)
  if (
    chave.startsWith('gigabyte_aorus') ||
    /aorus16|aorus\s*16/i.test(t) ||
    (/\bgigabyte\b/i.test(t) && /\ba16\b/i.test(t))
  ) {
    return montar({
      serie: 'gigabyte-aorus',
      marca: 'Gigabyte',
      linhaLabel: 'Gigabyte AORUS 16',
      gpu,
      tgpChassi: 115,
      suporta4k120Hz: true,
    });
  }
  if (
    chave.startsWith('gigabyte_g6') ||
    (/\b(gigabyte|aorus)\b/i.test(t) && /\bg6(?:kf)?\b/i.test(t))
  ) {
    return montar({
      serie: 'gigabyte-g6',
      marca: 'Gigabyte',
      linhaLabel: 'Gigabyte G6',
      gpu,
      tgpChassi: 105,
      suporta4k120Hz: false,
    });
  }

  // 8. ASUS Gaming V16 (V3607)
  if (
    (/v16|v3607|rp213/i.test(t) || chave.startsWith('asus_v3607')) &&
    !/nitro/i.test(t) &&
    !/gigabyte|aorus/i.test(t)
  ) {
    return montar({
      serie: 'asus-v16',
      marca: 'ASUS',
      linhaLabel: 'ASUS Gaming V16',
      gpu,
      tgpChassi: 60,
      suporta4k120Hz: false,
    });
  }

  // 9. ASUS TUF A16 (não Gigabyte A16)
  if (
    !/gigabyte|aorus/i.test(t) &&
    !chave.startsWith('gigabyte_') &&
    (/\ba16\b/.test(t) ||
      /\bfa607/.test(t) ||
      /\bfa608/.test(t) ||
      chave.startsWith('a16_') ||
      /^fa607|^fa608/.test(chave))
  ) {
    return montar({
      serie: 'tuf-a16',
      marca: 'ASUS',
      linhaLabel: 'ASUS TUF Gaming A16',
      gpu,
      tgpChassi: TGP_CHASSI_TUF,
      suporta4k120Hz: true,
    });
  }

  // 10. ASUS TUF F16
  if (
    /\bf16\b/.test(t) ||
    /\bfx608/.test(t) ||
    /\bfx607/.test(t) ||
    chave.startsWith('f16_') ||
    /^fx608|^fx607/.test(chave) ||
    /tuf\s*gaming/i.test(t)
  ) {
    return montar({
      serie: 'tuf-f16',
      marca: 'ASUS',
      linhaLabel: 'ASUS TUF Gaming F16',
      gpu,
      tgpChassi: TGP_CHASSI_TUF,
      suporta4k120Hz: true,
    });
  }

  return montar({
    serie: null,
    marca: 'Outro',
    linhaLabel: 'Outro',
    gpu,
    tgpChassi: 100,
    suporta4k120Hz: false,
  });
}

export function ehNotebookPermitido(chave: string, label = ''): boolean {
  if (ehForaEscopoDash(chave, label)) return false;
  const t = `${chave} ${label}`;
  // Lenovo LOQ e ASUS Gaming V16 (TGP capado) fora do monitoramento
  if (/loq|lenovo/i.test(t)) return false;
  if (/asus_v3607|v3607|gam(?:ing|er)\s*v\s*16/i.test(t) && !/nitro/i.test(t)) return false;
  return classificarNotebook(chave, label).serie != null;
}
