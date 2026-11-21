import {
  classificarNotebook,
  type CategoriaTgp,
  type MarcaNotebook,
} from './serie-notebook';

/**
 * Custo-benefício focado em TV 4K 60Hz sem VRR + Docker.
 *
 * Regras de negócio:
 * - TGP >= 110W: Full Power estável → bônus de estabilidade (+15 pts)
 * - TGP < 110W: penalidade severa (Nitro 95W, V16 60W etc. caem no ranking)
 * - RAM < 16 GB: permanece na lista, mas perde score + flag UPGRADE OBRIGATÓRIO
 * - TUF F16/A16 + 5050/5060/4060: TGP efetivo 115W (nunca 140W)
 */

export type SpecsCustoBeneficio = {
  gpu?: string | null;
  cpu?: string | null;
  ramGb?: number | null;
  preco: number;
  tgpWatts?: number | null;
  hdmiTipo?: 'frl' | 'tmds' | null;
};

type PerfilGpu = { peso: number; vramGb: number; mfg: boolean; nivel4k: Nivel4k };

export type Nivel4k = 'nativo' | 'dlss' | 'dlss-agressivo' | 'limitado';

const GPUS: Array<[RegExp, PerfilGpu]> = [
  [/5090/, { peso: 2.45, vramGb: 24, mfg: true, nivel4k: 'nativo' }],
  [/4090/, { peso: 2.15, vramGb: 16, mfg: false, nivel4k: 'nativo' }],
  [/5080/, { peso: 2.05, vramGb: 16, mfg: true, nivel4k: 'nativo' }],
  [/4080/, { peso: 1.8, vramGb: 12, mfg: false, nivel4k: 'dlss' }],
  [/5070\s*ti/, { peso: 1.75, vramGb: 12, mfg: true, nivel4k: 'dlss' }],
  [/5070/, { peso: 1.4, vramGb: 8, mfg: true, nivel4k: 'dlss' }],
  [/4070/, { peso: 1.15, vramGb: 8, mfg: false, nivel4k: 'dlss-agressivo' }],
  [/5060/, { peso: 1.18, vramGb: 8, mfg: true, nivel4k: 'dlss-agressivo' }],
  [/4060/, { peso: 1.0, vramGb: 8, mfg: false, nivel4k: 'limitado' }],
  [/5050/, { peso: 0.95, vramGb: 8, mfg: true, nivel4k: 'limitado' }],
  [/4050/, { peso: 0.8, vramGb: 6, mfg: false, nivel4k: 'limitado' }],
  [/3050/, { peso: 0.55, vramGb: 4, mfg: false, nivel4k: 'limitado' }],
];

const PADRAO_GPU: PerfilGpu = { peso: 0.6, vramGb: 4, mfg: false, nivel4k: 'limitado' };

export function perfilGpu(gpu?: string | null): PerfilGpu {
  const g = (gpu ?? '').toLowerCase().replace(/\s+/g, ' ');
  return GPUS.find(([re]) => re.test(g))?.[1] ?? PADRAO_GPU;
}

export const DESCRICAO_4K: Record<Nivel4k, string> = {
  nativo: '4K nativo/alto',
  dlss: '4K com DLSS',
  'dlss-agressivo': '4K só com DLSS Performance + Frame Gen',
  limitado: '4K só em jogos leves — ideal 1440p',
};

/** Limiar de estabilidade 4K sem VRR (Full Power). */
export const TGP_MIN_ESTAVEL_4K = 110;

/** Limiar para lista “Aprovados 4K” (= estabilidade). */
export const TGP_MIN_APROVADO_4K = TGP_MIN_ESTAVEL_4K;

/** Pontos extras só para TGP Full Power estável. */
export const BONUS_ESTABILIDADE_4K = 15;

/** Custo estimado de um pente SODIMM 8→16 GB (aviso; não soma no preço). */
export const CUSTO_UPGRADE_RAM_BRL = 200;

/** Em 4K a CPU quase não muda o FPS. */
function pesoCpu(cpu?: string | null): number {
  const c = (cpu ?? '').toLowerCase();
  if (/ultra\s*9|i9|ryzen\s*9/.test(c)) return 1.05;
  if (/ultra\s*7|i7|ryzen\s*7/.test(c)) return 1.03;
  return 1;
}

/** True quando o modelo precisa de upgrade de RAM (Docker + 4K). */
export function precisaUpgradeRam(ramGb?: number | null): boolean {
  return ramGb != null && Number.isFinite(ramGb) && ramGb > 0 && ramGb < 16;
}

/**
 * RAM: 8 GB penaliza ~30% (Docker + AAA). Não exclui o produto.
 */
function pesoRam(ramGb?: number | null): number {
  if (ramGb == null || !Number.isFinite(ramGb) || ramGb <= 0) return 0.95;
  if (ramGb < 16) return 0.7;
  if (ramGb < 32) return 1;
  return 1.04;
}

/**
 * TGP para TV 4K 60Hz sem VRR:
 * - >= 115W: Full Power ideal (TUF/Avell/LOQ 115W)
 * - >= 110W: Full Power mínimo aceitável
 * - < 110W: SEVERO — clocks caem e frametime fica irregular com V-Sync
 */
export function pesoTgp(tgpWatts?: number | null): number {
  if (tgpWatts == null || !Number.isFinite(tgpWatts)) return 0.7;
  if (tgpWatts >= 115) return 1.1;
  if (tgpWatts >= TGP_MIN_ESTAVEL_4K) return 1.05;
  if (tgpWatts >= 85) return 0.65; // Nitro V16 ~95W
  return 0.5; // Slim (ex.: Gaming V16 ~60W)
}

export function bonusEstabilidade4k(tgpWatts?: number | null): number {
  if (tgpWatts != null && Number.isFinite(tgpWatts) && tgpWatts >= TGP_MIN_ESTAVEL_4K) {
    return BONUS_ESTABILIDADE_4K;
  }
  return 0;
}

function pesoHdmi(hdmiTipo?: 'frl' | 'tmds' | null): number {
  if (hdmiTipo === 'tmds') return 0.93;
  return 1.0;
}

/**
 * Potência 4K bruta (índice).
 * Baseline aproximado: RTX 4060 115W + 16 GB ≈ 100 + bônus estabilidade.
 */
export function potencia4k(specs: Omit<SpecsCustoBeneficio, 'preco'>): number {
  const gpu = perfilGpu(specs.gpu);
  const bonusMfg = gpu.mfg ? 1.12 : 1;
  const base =
    100 *
    gpu.peso *
    bonusMfg *
    pesoCpu(specs.cpu) *
    pesoRam(specs.ramGb) *
    pesoTgp(specs.tgpWatts) *
    pesoHdmi(specs.hdmiTipo);
  return base + bonusEstabilidade4k(specs.tgpWatts);
}

export type CustoBeneficio4k = {
  potencia: number;
  /** Potência por R$ 1.000 — maior = melhor (métrica de ranking). */
  potenciaPorMil: number;
  /** R$ por ponto de potência — menor = melhor. */
  precoPorPonto: number;
  nivel4k: Nivel4k;
  upgradeRamObrigatorio: boolean;
  custoUpgradeRamBrl: number;
  /** TGP >= 110W. */
  aprovado4kTgp: boolean;
  /** Alias explícito da regra de estabilidade. */
  estabilidade4k: boolean;
  bonusEstabilidade: number;
};

/**
 * Função canônica de score do projeto.
 * Ranking usa `potenciaPorMil` (maior = melhor).
 */
export function calcularScore(modelo: SpecsCustoBeneficio): CustoBeneficio4k | null {
  return custoBeneficio4k(modelo);
}

export function custoBeneficio4k(specs: SpecsCustoBeneficio): CustoBeneficio4k | null {
  if (!Number.isFinite(specs.preco) || specs.preco <= 0) return null;
  const potencia = potencia4k(specs);
  const upgradeRamObrigatorio = precisaUpgradeRam(specs.ramGb);
  const bonusEstabilidade = bonusEstabilidade4k(specs.tgpWatts);
  const estabilidade4k = bonusEstabilidade > 0;
  return {
    potencia,
    potenciaPorMil: (potencia / specs.preco) * 1000,
    precoPorPonto: specs.preco / potencia,
    nivel4k: perfilGpu(specs.gpu).nivel4k,
    upgradeRamObrigatorio,
    custoUpgradeRamBrl: upgradeRamObrigatorio ? CUSTO_UPGRADE_RAM_BRL : 0,
    aprovado4kTgp: estabilidade4k,
    estabilidade4k,
    bonusEstabilidade,
  };
}

/** Compat: score relativo (potência / preço). */
export function scoreCustoBeneficio(specs: SpecsCustoBeneficio): number | null {
  return custoBeneficio4k(specs)?.potenciaPorMil ?? null;
}

/** Extrai GPU/CPU/RAM/TGP de um label e chave do notebook. */
export function specsFromLabel(
  label: string,
  chave = ''
): Omit<SpecsCustoBeneficio, 'preco'> {
  const partes = label.split('·').map((p) => p.trim());
  let gpu: string | null = null;
  let cpu: string | null = null;
  let ramGb: number | null = null;

  for (const p of partes) {
    if (/rtx\s*\d{4}/i.test(p)) gpu = p;
    else if (/\b\d+\s*gb\b/i.test(p) && !/ssd/i.test(p)) {
      ramGb = Number(p.match(/(\d+)\s*gb/i)?.[1] ?? 0) || null;
    } else if (/core|ryzen|ultra|i[3579]/i.test(p)) {
      cpu = p;
    }
  }

  if (!gpu) {
    gpu = label.match(/rtx\s*\d{4}(?:\s*ti)?/i)?.[0] ?? null;
  }
  if (!ramGb) {
    const mRam = label.match(/(\d+)\s*gb(?:\s*ram|\s*ddr\d)?/i);
    if (mRam && !/ssd/i.test(mRam[0])) ramGb = Number(mRam[1]) || null;
  }
  if (!cpu) {
    cpu = label.match(/(core\s*(?:ultra\s*)?[i\d]+[-\w]*|ryzen\s*\d+[-\w]*)/i)?.[0] ?? null;
  }

  const cls = classificarNotebook(chave || label, label);
  const tgpWatts = cls.tgpWatts;
  const hdmiTipo: 'frl' | 'tmds' = cls.suporta4k120Hz ? 'frl' : 'tmds';

  return { gpu, cpu, ramGb, tgpWatts, hdmiTipo };
}

export type ItemDestaque4k = {
  produtoChave: string;
  label: string;
  modelo: string;
  marca: MarcaNotebook;
  linhaLabel: string;
  specsCurta: string;
  preco: number;
  loja: string | null;
  url: string | null;
  potencia: number;
  potenciaPorMil: number;
  precoPorPonto: number;
  nivel4k: Nivel4k;
  ramGb: number | null;
  gpu: string | null;
  cpu: string | null;
  tgpWatts: number;
  categoriaTgp: CategoriaTgp;
  suporta4k120Hz: boolean;
};

export type Destaques4k = {
  campeao: ItemDestaque4k | null;
  menorEntrada: ItemDestaque4k | null;
  maxPotencia: ItemDestaque4k | null;
  alerta8gb: {
    modelo: string;
    preco: number;
    ramGb: number;
    loja: string | null;
    url: string | null;
  } | null;
  alertaTgp: {
    modelo: string;
    tgpWatts: number;
    aviso: string;
  } | null;
  hdmiInfo: {
    versao: string;
    suporte: string;
    dica: string;
  };
};

/**
 * Destaques da Hero (TV 4K via HDMI).
 * Campeão: maior potenciaPorMil entre modelos com 16GB+ e TGP estável (>=110W),
 * preferindo orçamento <= R$ 9.000.
 */
export function calcularDestaques4k(
  produtos: Array<{
    produtoChave: string;
    label: string;
    menorPreco: number | null;
    lojaMenorPreco: string | null;
    urlMenorPreco?: string | null;
  }>
): Destaques4k | null {
  const itens: ItemDestaque4k[] = [];
  let alerta8gb: Destaques4k['alerta8gb'] = null;

  for (const p of produtos) {
    if (p.menorPreco == null || p.menorPreco <= 0) continue;
    const specs = specsFromLabel(p.label, p.produtoChave);
    const cb = custoBeneficio4k({ ...specs, preco: p.menorPreco });
    if (!cb) continue;

    const cls = classificarNotebook(p.produtoChave, p.label);
    const partes = p.label.split('·').map((s) => s.trim());
    const modelo = cls.linhaLabel || partes[0] || p.produtoChave.toUpperCase();
    const specsCurta =
      partes.slice(1).join(' · ') ||
      `${specs.cpu ?? ''} ${specs.ramGb ? specs.ramGb + ' GB' : ''} ${specs.gpu ?? ''}`.trim();

    if (specs.ramGb && specs.ramGb < 16) {
      if (!alerta8gb || p.menorPreco < alerta8gb.preco) {
        alerta8gb = {
          modelo,
          preco: p.menorPreco,
          ramGb: specs.ramGb,
          loja: p.lojaMenorPreco ?? null,
          url: p.urlMenorPreco ?? null,
        };
      }
    }

    itens.push({
      produtoChave: p.produtoChave,
      label: p.label,
      modelo,
      marca: cls.marca,
      linhaLabel: cls.linhaLabel,
      specsCurta,
      preco: p.menorPreco,
      loja: p.lojaMenorPreco,
      url: p.urlMenorPreco ?? null,
      potencia: cb.potencia,
      potenciaPorMil: cb.potenciaPorMil,
      precoPorPonto: cb.precoPorPonto,
      nivel4k: cb.nivel4k,
      ramGb: specs.ramGb ?? null,
      gpu: specs.gpu ?? null,
      cpu: specs.cpu ?? null,
      tgpWatts: cls.tgpWatts,
      categoriaTgp: cls.categoriaTgp,
      suporta4k120Hz: cls.suporta4k120Hz,
    });
  }

  if (itens.length === 0) return null;

  const itens16gb = itens.filter((i) => (i.ramGb ?? 16) >= 16);
  const itensEstaveis = (itens16gb.length > 0 ? itens16gb : itens).filter(
    (i) => i.tgpWatts >= TGP_MIN_ESTAVEL_4K
  );
  const pool = itensEstaveis.length > 0 ? itensEstaveis : itens16gb.length > 0 ? itens16gb : itens;
  const baseOrcamento = pool.filter((i) => i.preco <= 9000);
  const baseCandidatos = baseOrcamento.length > 0 ? baseOrcamento : pool;
  const campeao = baseCandidatos.reduce((melhor, atual) =>
    atual.potenciaPorMil > melhor.potenciaPorMil ? atual : melhor
  );

  const menorEntrada = (itens16gb.length > 0 ? itens16gb : itens).reduce((menor, atual) =>
    atual.preco < menor.preco ? atual : menor
  );

  const maxPotencia = itens.reduce((maior, atual) =>
    atual.potencia > maior.potencia ? atual : maior
  );

  const modeloCapado = itens.find((i) => i.tgpWatts < TGP_MIN_ESTAVEL_4K);
  const alertaTgp = modeloCapado
    ? {
      modelo: modeloCapado.modelo,
      tgpWatts: modeloCapado.tgpWatts,
      aviso: `${modeloCapado.modelo} tem TGP ${modeloCapado.tgpWatts}W (< ${TGP_MIN_ESTAVEL_4K}W). Penalizado para 4K sem VRR.`,
    }
    : null;

  return {
    campeao,
    menorEntrada,
    maxPotencia,
    alerta8gb,
    alertaTgp,
    hdmiInfo: {
      versao: 'HDMI 2.1 FRL',
      suporte: '4K @ 120Hz + VRR',
      dica: 'Conexão nativa TV 4K sem perda (48 Gbps). Use cabo HDMI 2.1 Ultra High Speed.',
    },
  };
}
