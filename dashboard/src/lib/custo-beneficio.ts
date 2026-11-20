/**
 * Custo-benefício com foco em JOGOS EM 4K.
 *
 * Em 4K o gargalo é quase todo da GPU; CPU pesa pouco e RAM só penaliza
 * quando falta (8 GB derruba frametime). Pesos de GPU = desempenho relativo
 * aproximado das versões notebook (RTX 4060 Laptop = 1.00), com bônus para a
 * série 50 pelo DLSS 4 Multi Frame Generation, que é o que viabiliza 4K
 * jogável nessas placas de entrada.
 */

export type SpecsCustoBeneficio = {
  gpu?: string | null;
  cpu?: string | null;
  ramGb?: number | null;
  preco: number;
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

/** Em 4K a CPU quase não muda o FPS. */
function pesoCpu(cpu?: string | null): number {
  const c = (cpu ?? '').toLowerCase();
  if (/ultra\s*9|i9|ryzen\s*9/.test(c)) return 1.05;
  if (/ultra\s*7|i7|ryzen\s*7/.test(c)) return 1.03;
  return 1;
}

/** RAM: 8 GB penaliza forte em jogos AAA 4K; acima de 16 GB ganho pequeno. */
function pesoRam(ramGb?: number | null): number {
  if (ramGb == null || !Number.isFinite(ramGb) || ramGb <= 0) return 0.95;
  if (ramGb < 16) return 0.78;
  if (ramGb < 32) return 1;
  return 1.04;
}

/** Potência 4K (índice; RTX 4060 + 16 GB ≈ 100). */
export function potencia4k(specs: Omit<SpecsCustoBeneficio, 'preco'>): number {
  const gpu = perfilGpu(specs.gpu);
  const bonusMfg = gpu.mfg ? 1.12 : 1;
  return 100 * gpu.peso * bonusMfg * pesoCpu(specs.cpu) * pesoRam(specs.ramGb);
}

export type CustoBeneficio4k = {
  potencia: number;
  /** Potência por R$ 1.000 — maior = melhor. */
  potenciaPorMil: number;
  /** R$ por ponto de potência — menor = melhor. */
  precoPorPonto: number;
  nivel4k: Nivel4k;
};

export function custoBeneficio4k(specs: SpecsCustoBeneficio): CustoBeneficio4k | null {
  if (!Number.isFinite(specs.preco) || specs.preco <= 0) return null;
  const potencia = potencia4k(specs);
  return {
    potencia,
    potenciaPorMil: (potencia / specs.preco) * 1000,
    precoPorPonto: specs.preco / potencia,
    nivel4k: perfilGpu(specs.gpu).nivel4k,
  };
}

/** Compat: score relativo (potência / preço). */
export function scoreCustoBeneficio(specs: SpecsCustoBeneficio): number | null {
  return custoBeneficio4k(specs)?.potenciaPorMil ?? null;
}

/** Extrai GPU/CPU/RAM de um label tipo "FX608JHI · Core i5 · 16 GB · RTX 5050". */
export function specsFromLabel(label: string): Omit<SpecsCustoBeneficio, 'preco'> {
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

  // Fallbacks caso não tenha separador '·'
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

  return { gpu, cpu, ramGb };
}

export type ItemDestaque4k = {
  produtoChave: string;
  label: string;
  modelo: string;
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
  hdmiInfo: {
    versao: string;
    suporte: string;
    dica: string;
  };
};

/**
 * Calcula os 4 destaques da Hero focados em TV 4K via HDMI:
 * 1. Campeão Custo-Benefício 4K (maior potência por R$)
 * 2. Entrada 4K Mais Barata (menor preço viável com 16 GB)
 * 3. Máxima Potência 4K (maior pontuação bruta de benchmark 4K)
 * 4. HDMI 2.1 & Alerta de 8 GB RAM
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
    const specs = specsFromLabel(p.label);
    const cb = custoBeneficio4k({ ...specs, preco: p.menorPreco });
    if (!cb) continue;

    const partes = p.label.split('·').map((s) => s.trim());
    const modelo = partes[0] || p.produtoChave.toUpperCase();
    const specsCurta =
      partes.slice(1).join(' · ') ||
      `${specs.cpu ?? ''} ${specs.ramGb ? specs.ramGb + ' GB' : ''} ${specs.gpu ?? ''}`.trim();

    if (specs.ramGb && specs.ramGb < 16) {
      if (!alerta8gb || p.menorPreco < alerta8gb.preco) {
        alerta8gb = {
          modelo,
          preco: p.menorPreco,
          ramGb: specs.ramGb,
          loja: p.lojaMenorPreco,
          url: p.urlMenorPreco ?? null,
        };
      }
    }

    itens.push({
      produtoChave: p.produtoChave,
      label: p.label,
      modelo,
      specsCurta,
      preco: p.menorPreco,
      loja: p.lojaMenorPreco,
      url: p.urlMenorPreco ?? null,
      potencia: cb.potencia,
      potenciaPorMil: cb.potenciaPorMil,
      precoPorPonto: cb.precoPorPonto,
      nivel4k: cb.nivel4k,
      ramGb: specs.ramGb,
      gpu: specs.gpu,
      cpu: specs.cpu,
    });
  }

  if (itens.length === 0) return null;

  // 1. Campeão: maior potência por R$ 1.000 (privilegiando 16 GB+ para estabilidade em 4K)
  const itens16gb = itens.filter((i) => (i.ramGb ?? 16) >= 16);
  const campeao = (itens16gb.length > 0 ? itens16gb : itens).reduce((melhor, atual) =>
    atual.potenciaPorMil > melhor.potenciaPorMil ? atual : melhor
  );

  // 2. Entrada 4K Mais Barata: menor preço entre modelos viáveis
  const menorEntrada = (itens16gb.length > 0 ? itens16gb : itens).reduce((menor, atual) =>
    atual.preco < menor.preco ? atual : menor
  );

  // 3. Máxima Potência 4K: maior índice bruto de potência
  const maxPotencia = itens.reduce((maior, atual) =>
    atual.potencia > maior.potencia ? atual : maior
  );

  return {
    campeao,
    menorEntrada,
    maxPotencia,
    alerta8gb,
    hdmiInfo: {
      versao: 'HDMI 2.1 FRL',
      suporte: '4K @ 120Hz + VRR',
      dica: 'Conexão nativa TV 4K sem perda. Use cabo HDMI 2.1 Ultra High Speed (48 Gbps).',
    },
  };
}
