import { Browser, BrowserContext, chromium } from 'playwright';
import { CHROME_HEADERS } from '../../config/http';
import { formatBRL } from '../../lib/preco';
import { Oferta, toOferta } from '../../types/oferta';
import { verificarOfertaComPlaywright } from './despachante';

const TIPOS_BLOQUEADOS = new Set(['image', 'media', 'font', 'stylesheet']);
const DOMINIOS_BLOQUEADOS =
  /google-analytics|googletagmanager|facebook|criteo|doubleclick|clarity\.ms|hotjar|adnxs|scorecardresearch|analytics|connect\.facebook/i;

export async function validarTopOfertasComPlaywright(
  candidatas: Oferta[],
  maxTop = 5,
  limiteAnalise?: number
): Promise<Oferta[]> {
  const inicio = Date.now();
  let browser: Browser | null = null;
  const ofertasValidadas: Oferta[] = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
      ],
    });

    const context: BrowserContext = await browser.newContext({
      userAgent: CHROME_HEADERS['User-Agent'],
      viewport: { width: 1280, height: 800 },
      extraHTTPHeaders: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    // Bloqueio de recursos pesados (imagens, vídeos, fontes, css) e telemetria para acelerar a carga do DOM
    await context.route('**/*', (route) => {
      const req = route.request();
      const resourceType = req.resourceType();
      const url = req.url();
      if (TIPOS_BLOQUEADOS.has(resourceType) || DOMINIOS_BLOQUEADOS.test(url)) {
        return route.abort();
      }
      return route.continue();
    });

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(15000);

    const maxAnalisar = limiteAnalise ?? candidatas.length;
    let analisadas = 0;

    for (const oferta of candidatas) {
      if (ofertasValidadas.length >= maxTop) break;
      if (analisadas >= maxAnalisar) break;
      analisadas++;

      console.log(`[Playwright Frontend] Verificando [${oferta.loja}] ${oferta.titulo} (${oferta.url})...`);
      const resultado = await verificarOfertaComPlaywright(page, oferta);

      if (!resultado.valida) {
        console.warn(`[Playwright Frontend] ❌ OFERTA REJEITADA: ${resultado.motivo} | ${oferta.url}`);
        continue;
      }

      let ofertaFinal = oferta;
      const precoFinalConfirmado = resultado.precoConfirmado ?? oferta.precoAVista;
      const alterouPreco = precoFinalConfirmado !== oferta.precoAVista;

      ofertaFinal = toOferta({
        ...oferta,
        precoAVista: precoFinalConfirmado,
        precoParcelado: resultado.precoParceladoConfirmado ?? oferta.precoParcelado,
        detalhesParcelamento: resultado.detalhesParcelamentoConfirmado ?? oferta.detalhesParcelamento,
        cupomTag: resultado.cupomTagConfirmado ?? oferta.cupomTag,
        cupomDesconto: resultado.cupomDescontoConfirmado ?? oferta.cupomDesconto,
        precoComCupom: resultado.precoComCupomConfirmado ?? oferta.precoComCupom,
        fonteId: oferta.fonteId || 'verificado',
      });

      if (alterouPreco) {
        console.log(
          `[Playwright Frontend] Preço atualizado no front: ${formatBRL(oferta.precoAVista)} -> ${formatBRL(
            precoFinalConfirmado
          )}`
        );
      }

      console.log(`[Playwright Frontend] ✅ OFERTA APROVADA: ${ofertaFinal.loja} - ${formatBRL(ofertaFinal.precoTotal)}`);
      ofertasValidadas.push(ofertaFinal);
    }

    // Se o validador descartou muitas ofertas e sobrou menos de maxTop, preenche com as próximas melhores candidatas não-rejeitadas
    if (ofertasValidadas.length < maxTop && candidatas.length > ofertasValidadas.length) {
      const urlsExistentes = new Set(ofertasValidadas.map((o) => o.url));
      for (const cand of candidatas) {
        if (ofertasValidadas.length >= maxTop) break;
        if (!urlsExistentes.has(cand.url)) {
          console.log(`[Playwright Frontend] Preenchendo vaga do Top com candidata qualificada: [${cand.loja}] ${cand.titulo}`);
          ofertasValidadas.push(cand);
          urlsExistentes.add(cand.url);
        }
      }
    }
  } catch (err: any) {
    console.error(`[Playwright Frontend] Erro geral no validador Playwright: ${err.message}`);
    return candidatas.slice(0, maxTop);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    const duracaoMs = Date.now() - inicio;
    console.log(`[Playwright Frontend] ⏱️ Tempo total gasto na validação: ${(duracaoMs / 1000).toFixed(2)}s`);
  }

  return ofertasValidadas;
}
