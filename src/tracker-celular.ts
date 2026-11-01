import dotenv from 'dotenv';
dotenv.config();

import { exigirWebhookCelular } from './config/env';
import { TAMANHO_PODIO_CELULAR } from './config/regras-celular';
import { separarOfertasCelular } from './domain/filtros-celular';
import { ordenarPorTotal } from './domain/ranking';
import { coletarOfertasCelular } from './scrapers/celular';
import { enviarParaDiscordCelular } from './services/discord-celular';
import { validarTopOfertasCelularComPlaywright } from './services/verificador-playwright';

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

  const { poco: candidatasPoco, xiaomi: candidatasXiaomi } = separarOfertasCelular(ordenadas);
  console.log(
    `[Tracker Celular] Ofertas qualificadas por categoria: ${candidatasPoco.length} Poco X8 Pro Max e ${candidatasXiaomi.length} Xiaomi 15T Pro / 17T Pro.`
  );

  const metaTopPorCategoria = TAMANHO_PODIO_CELULAR;
  const limiteAnalisePorCategoria = Math.max(metaTopPorCategoria * 3, 15);

  console.log(
    `\n[Validador Frontend] Executando verificação de front com Playwright para compor Top ${metaTopPorCategoria} de cada categoria...`
  );
  const { poco: pocoValidadas, xiaomi: xiaomiValidadas } =
    await validarTopOfertasCelularComPlaywright(
      candidatasPoco,
      candidatasXiaomi,
      metaTopPorCategoria,
      limiteAnalisePorCategoria
    );

  const totalValidadas = pocoValidadas.length + xiaomiValidadas.length;
  if (totalValidadas === 0) {
    console.warn('Nenhuma oferta permaneceu válida após a validação do Playwright. Nada enviado ao Discord.');
    return;
  }

  const finalPoco = ordenarPorTotal(pocoValidadas);
  const finalXiaomi = ordenarPorTotal(xiaomiValidadas);

  await enviarParaDiscordCelular({ poco: finalPoco, xiaomi: finalXiaomi });
}

main().catch((err) => {
  console.error('Erro ao executar o tracker de celular:', err);
  process.exit(1);
});
