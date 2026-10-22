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
  console.log('🔍 [Tracker Celular] Iniciando busca por promoções do Xiaomi 17T Pro e Linha T...');
  const coletadas = await coletarOfertasCelular();
  const ordenadas = ordenarPorTotal(coletadas);

  if (ordenadas.length === 0) {
    console.warn('Nenhuma oferta de Xiaomi 17T Pro encontrada no momento. Nada enviado ao Discord.');
    return;
  }

  console.log(`\n[Validador Frontend] Executando verificação de front com Playwright no Top ${TAMANHO_PODIO_CELULAR}...`);
  const ofertasValidadas = await validarTopOfertasComPlaywright(ordenadas, TAMANHO_PODIO_CELULAR);

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
