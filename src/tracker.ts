import dotenv from 'dotenv';
dotenv.config();

import './config/env';
import { coletarOfertas } from './services/collector';
import { enriquecerRamNotebooks } from './services/enriquecer-ram';
import { enriquecerOfertasComCupons } from './services/cupons';
import { confirmarPrecosAmazonPdp } from './services/confirmar-amazon-pdp';
import { enviarParaDiscord } from './services/discord';
import { salvarHistoricoNotebooks } from './services/historico';
import { ordenarPorTotal } from './domain/ranking';
import { validarTopOfertasComPlaywright } from './services/verificador-playwright';
import { TAMANHO_PODIO } from './config/regras';
import type { Oferta } from './types/oferta';

/** Sobrescreve no pool as ofertas validadas (mesmo URL) — preço Playwright vai para o Turso. */
function mesclarValidadas(pool: Oferta[], validadas: Oferta[]): Oferta[] {
  const porUrl = new Map(validadas.map((o) => [o.url.split('?')[0]!.toLowerCase(), o]));
  return pool.map((o) => {
    const key = o.url.split('?')[0]!.toLowerCase();
    return porUrl.get(key) ?? o;
  });
}

async function main(): Promise<void> {
  const brutas = await coletarOfertas();

  // Garante RAM em todas as ofertas (título → página → ficha técnica → estimativa).
  const comRam = await enriquecerRamNotebooks(brutas);

  // CupomDescontos em modo somente-leitura (não muta preço nos notebooks).
  const coletadas = await enriquecerOfertasComCupons(comRam);

  // Amazon: preço/cupom da PDP antes do histórico.
  const comPdp = await confirmarPrecosAmazonPdp(coletadas);

  const ordenadas = ordenarPorTotal(comPdp);

  if (ordenadas.length === 0) {
    console.warn('Nenhuma oferta ativa após as consultas. Nada enviado ao Discord.');
    return;
  }

  console.log(`\n[Validador Frontend] Executando verificação de front com Playwright no Top ${TAMANHO_PODIO}...`);
  const ofertasValidadas = await validarTopOfertasComPlaywright(ordenadas, TAMANHO_PODIO);

  // Histórico com preços já confirmados (PDP + Playwright no Top N).
  const paraHistorico = mesclarValidadas(comPdp, ofertasValidadas);
  await salvarHistoricoNotebooks(paraHistorico);

  if (ofertasValidadas.length === 0) {
    console.warn('Nenhuma oferta permaneceu válida após a validação do Playwright. Nada enviado ao Discord.');
    return;
  }

  await enviarParaDiscord(ofertasValidadas);
}

main().catch((err) => {
  console.error('Erro ao executar o tracker:', err);
  process.exit(1);
});
