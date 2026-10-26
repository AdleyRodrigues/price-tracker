import dotenv from 'dotenv';
dotenv.config();

import { exigirWebhookCelular } from './config/env';
import { TAMANHO_PODIO_CELULAR } from './config/regras-celular';
import { ordenarPorTotal } from './domain/ranking';
import { coletarOfertasCelular } from './scrapers/celular';
import { enviarParaDiscordCelular } from './services/discord-celular';
import { validarTopOfertasComPlaywright } from './services/verificador-playwright';

exigirWebhookCelular();

async function main(): Promise<void> {
  console.log('📱 [Tracker Celular] Iniciando varredura massiva em mecanismos de pesquisa e lojas...');
  console.log('   Fontes ativas: Zoom, Buscapé, KaBuM!, Promobit, Amazon, Mercado Livre e Catálogo Direto');
  
  const coletadas = await coletarOfertasCelular();
  console.log(`[Tracker Celular] Varredura concluída: ${coletadas.length} ofertas qualificadas encontradas no total.`);

  const ordenadas = ordenarPorTotal(coletadas);

  if (ordenadas.length === 0) {
    console.warn('Nenhuma oferta de celular Xiaomi/Poco encontrada no momento. Nada enviado ao Discord.');
    return;
  }

  const metaTop = TAMANHO_PODIO_CELULAR;
  console.log(`\n[Validador Frontend] Executando verificação de front com Playwright para compor Top ${metaTop} completo...`);
  const limiteAnalise = Math.max(metaTop * 3, 30);
  const ofertasValidadas = await validarTopOfertasComPlaywright(ordenadas, metaTop, limiteAnalise);

  if (ofertasValidadas.length === 0) {
    console.warn('Nenhuma oferta permaneceu válida após a validação do Playwright. Nada enviado ao Discord.');
    return;
  }

  const finalOrdenadas = ordenarPorTotal(ofertasValidadas);
  await enviarParaDiscordCelular(finalOrdenadas);
}

main().catch((err) => {
  console.error('Erro ao executar o tracker de celular:', err);
  process.exit(1);
});
