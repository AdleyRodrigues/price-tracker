/**
 * Perfis de Chassi, TGP e Conectividade para Notebooks Gamers.
 * Base para cálculo de potência real em 4K e tarefas pesadas (multi-agentes / dev).
 *
 * TGP efetivo = min(teto do chassi, teto oficial da GPU).
 * Ex.: TUF pode alimentar até 140W em SKUs altos, mas RTX 5050/5060
 * têm teto ASUS de 115W (100W + 15W Dynamic Boost).
 */

export type CategoriaTgp = 'full_power' | 'balanceado' | 'slim_reduzido';

export type PerfilChassi = {
  marca: 'ASUS' | 'Avell' | 'Lenovo' | 'Acer' | 'Dell' | 'Outro';
  linha: string;
  /** Teto elétrico do chassi (antes do clamp por GPU). */
  tgpWatts: number;
  categoriaTgp: CategoriaTgp;
  hdmiVersao: 'HDMI 2.1 FRL (48 Gbps)' | 'HDMI 2.1 TMDS (18 Gbps)';
  suporta4k120Hz: boolean;
  slotsRamSodimm: number;
  ramMaxGb: number;
  avisoHardware?: string | null;
};

/** Tetos oficiais de TGP (W) por família de GPU notebook. */
const TETO_TGP_GPU: Array<[RegExp, number]> = [
  [/5090/, 175],
  [/5080/, 175],
  [/5070\s*ti/, 140],
  [/5070/, 115],
  [/50[56]0/, 115], // 5050 / 5060: 100W + 15W Dynamic Boost
  [/4090/, 175],
  [/4080/, 175],
  [/4070/, 140],
  [/4060/, 115],
  [/4050/, 115],
];

/**
 * Teto de TGP da GPU a partir de texto ("RTX 5060", chave, etc.).
 * Retorna null se a família não for reconhecida.
 */
export function tetoTgpGpu(gpuOuTexto?: string | null): number | null {
  if (!gpuOuTexto) return null;
  const g = gpuOuTexto.toLowerCase().replace(/\s+/g, ' ');
  for (const [re, teto] of TETO_TGP_GPU) {
    if (re.test(g)) return teto;
  }
  return null;
}

/** Aplica o teto da GPU sobre o TGP do chassi. */
export function tgpEfetivo(tgpChassi: number, gpuOuTexto?: string | null): number {
  const teto = tetoTgpGpu(gpuOuTexto);
  if (teto == null) return tgpChassi;
  return Math.min(tgpChassi, teto);
}

/** Full Power só a partir de 110W (estável para 4K sem VRR). */
export function categoriaTgpPorWatts(tgpWatts: number): CategoriaTgp {
  if (tgpWatts >= 110) return 'full_power';
  if (tgpWatts >= 85) return 'balanceado';
  return 'slim_reduzido';
}

export const PERFIS_CHASSI: Record<string, PerfilChassi> = {
  // ASUS TUF F16: chassi aguenta até ~140W em SKUs altos; 5050/5060 clampam em 115W
  tuf_f16: {
    marca: 'ASUS',
    linha: 'TUF Gaming F16',
    tgpWatts: 140,
    categoriaTgp: 'full_power',
    hdmiVersao: 'HDMI 2.1 FRL (48 Gbps)',
    suporta4k120Hz: true,
    slotsRamSodimm: 2,
    ramMaxGb: 64,
  },
  // ASUS TUF A16
  tuf_a16: {
    marca: 'ASUS',
    linha: 'TUF Gaming A16',
    tgpWatts: 140,
    categoriaTgp: 'full_power',
    hdmiVersao: 'HDMI 2.1 FRL (48 Gbps)',
    suporta4k120Hz: true,
    slotsRamSodimm: 2,
    ramMaxGb: 64,
  },
  // Avell Storm 560: Chassi TongFang 115W Full Power
  avell_storm560: {
    marca: 'Avell',
    linha: 'Storm 560',
    tgpWatts: 115,
    categoriaTgp: 'full_power',
    hdmiVersao: 'HDMI 2.1 FRL (48 Gbps)',
    suporta4k120Hz: true,
    slotsRamSodimm: 2,
    ramMaxGb: 64,
  },
  // Avell ION A70: Chassi leve liga de magnésio 115W Full Power
  avell_iona70: {
    marca: 'Avell',
    linha: 'ION A70',
    tgpWatts: 115,
    categoriaTgp: 'full_power',
    hdmiVersao: 'HDMI 2.1 FRL (48 Gbps)',
    suporta4k120Hz: true,
    slotsRamSodimm: 2,
    ramMaxGb: 64,
  },
  // Lenovo LOQ 15 / 16: TGP 105W - 115W (usa 115 como perfil padrão Full Power)
  lenovo_loq: {
    marca: 'Lenovo',
    linha: 'LOQ 15/16',
    tgpWatts: 115,
    categoriaTgp: 'full_power',
    hdmiVersao: 'HDMI 2.1 FRL (48 Gbps)',
    suporta4k120Hz: true,
    slotsRamSodimm: 2,
    ramMaxGb: 64,
  },
  // Acer Nitro V16: TGP 85W - 95W
  acer_nitro_v16: {
    marca: 'Acer',
    linha: 'Nitro V16',
    tgpWatts: 95,
    categoriaTgp: 'balanceado',
    hdmiVersao: 'HDMI 2.1 FRL (48 Gbps)',
    suporta4k120Hz: true,
    slotsRamSodimm: 2,
    ramMaxGb: 32,
  },
  // ASUS Gaming V16 (V3607): Chassi fino de entrada com 55W - 65W
  asus_v16: {
    marca: 'ASUS',
    linha: 'Gaming V16 (V3607)',
    tgpWatts: 60,
    categoriaTgp: 'slim_reduzido',
    hdmiVersao: 'HDMI 2.1 TMDS (18 Gbps)',
    suporta4k120Hz: false,
    slotsRamSodimm: 1,
    ramMaxGb: 24,
    avisoHardware: 'TGP reduzido a 60W e HDMI TMDS. Menor desempenho em 4K.',
  },
};

function perfilComTgpEfetivo(base: PerfilChassi, textoOuChave: string): PerfilChassi {
  const watts = tgpEfetivo(base.tgpWatts, textoOuChave);
  return {
    ...base,
    tgpWatts: watts,
    categoriaTgp: categoriaTgpPorWatts(watts),
  };
}

/**
 * Retorna o perfil de hardware e TGP efetivo com base no título, part-number ou chave.
 * Aplica teto da GPU (ex.: TUF + RTX 5060 → 115W, não 140W).
 */
export function obterPerfilChassi(textoOuChave: string): PerfilChassi {
  const t = textoOuChave.toLowerCase();

  // 1. Avell Storm / ION
  if (/storm[\s\-]*560|storm560/i.test(t)) return perfilComTgpEfetivo(PERFIS_CHASSI.avell_storm560!, t);
  if (/ion[\s\-]*a\s*70|ion[\s\-]*a70|iona70/i.test(t))
    return perfilComTgpEfetivo(PERFIS_CHASSI.avell_iona70!, t);

  // 2. Lenovo LOQ
  if (/loq/i.test(t)) return perfilComTgpEfetivo(PERFIS_CHASSI.lenovo_loq!, t);

  // 3. Acer Nitro V16
  if (/nitro\s*v16|anv16/i.test(t)) return perfilComTgpEfetivo(PERFIS_CHASSI.acer_nitro_v16!, t);

  // 4. ASUS Gaming V16 (V3607)
  if (/v16|v3607|rp213/i.test(t) && !/nitro/i.test(t)) {
    return perfilComTgpEfetivo(PERFIS_CHASSI.asus_v16!, t);
  }

  // 5. ASUS TUF A16
  if (/a16|fa607|fa608/i.test(t)) return perfilComTgpEfetivo(PERFIS_CHASSI.tuf_a16!, t);

  // 6. ASUS TUF F16 (padrão)
  return perfilComTgpEfetivo(PERFIS_CHASSI.tuf_f16!, t);
}
