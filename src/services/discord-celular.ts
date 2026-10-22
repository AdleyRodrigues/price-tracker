import axios from 'axios';
import { DISCORD_CELULAR_WEBHOOK_URL, USER_ID } from '../config/env';
import { CEP, TAMANHO_PODIO_CELULAR, THRESHOLD_ALERTA_CRITICO_CELULAR } from '../config/regras-celular';
import { podio } from '../domain/ranking';
import { formatBRL } from '../lib/preco';
import { corDoVencedor, formatarItemField } from './discord';
import { Oferta } from '../types/oferta';

export function montarPayloadDiscordCelular(
  ofertas: Oferta[],
  userId = USER_ID,
  cep = CEP,
  tamanho = TAMANHO_PODIO_CELULAR
) {
  const melhor = ofertas[0];
  if (!melhor) return null;

  const lugares = podio(ofertas, tamanho);
  const fields = lugares.map((o, i) => formatarItemField(o, i));
  const menorPrecoEfetivo = melhor.precoComCupom ?? melhor.precoTotal;
  const ehAlertaCritico = menorPrecoEfetivo <= THRESHOLD_ALERTA_CRITICO_CELULAR;
  const mencao = ehAlertaCritico ? `<@${userId}> 🚨 **OPORTUNIDADE ABAIXO DE ${formatBRL(THRESHOLD_ALERTA_CRITICO_CELULAR)}!**\n` : '';

  return {
    content: `${mencao}📱 Pódio de Ofertas — Celulares Xiaomi & Poco.`,
    embeds: [
      {
        title: '📱 Monitor Xiaomi & Poco (17T Pro | 15T Pro | Poco X8 Pro Max)',
        url: melhor.url,
        description:
          `Comparativo (Top ${lugares.length}) para o CEP **${cep}**.\n` +
          `Melhor oferta: **${melhor.loja}** por **${formatBRL(menorPrecoEfetivo)}**\n` +
          `Modelos: Xiaomi 17T Pro, Xiaomi 15T Pro, Poco X8 Pro Max.\n\n` +
          `${melhor.titulo}`,
        color: 0xff6900, // Laranja Xiaomi / Poco
        fields,
        footer: {
          text: `CEP ${cep} • ${new Date().toLocaleString('pt-BR')}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export async function enviarParaDiscordCelular(ofertas: Oferta[]): Promise<void> {
  const url = DISCORD_CELULAR_WEBHOOK_URL?.trim();
  if (!url) {
    console.error('DISCORD_CELULAR_WEBHOOK_URL não configurado.');
    return;
  }

  const payload = montarPayloadDiscordCelular(ofertas);
  if (!payload) {
    console.error('Nenhuma oferta para enviar.');
    return;
  }

  const medalhas = ['🥇 1º', '🥈 2º', '🥉 3º', '🎖️ 4º', '🎖️ 5º', '6º', '7º', '8º', '9º', '10º'];
  const lugares = podio(ofertas, TAMANHO_PODIO_CELULAR);

  console.log(`\n📱 [PÓDIO CELULARES (XIAOMI & POCO) TOP ${lugares.length}]`);
  lugares.forEach((o, i) => {
    console.log(
      `  ${medalhas[i] || `${i + 1}º`} ${o.loja} — à vista ${formatBRL(o.precoAVista)}${o.cupomTag ? ` [Cupom: ${o.cupomTag}]` : ''}\n     ${o.titulo}\n     Link: ${o.url}`
    );
  });

  try {
    await axios.post(url, payload);
    console.log(`\n✅ Notificação de Celular enviada ao Discord (#celular) com sucesso.`);
  } catch (err: any) {
    const status = err.response?.status ?? 'Erro de rede';
    const statusText = err.response?.statusText ?? 'Falha na comunicação';
    console.warn(`\n⚠️ Falha ao entregar mensagem no Discord (#celular): ${status} (${statusText}).`);
  }
}
