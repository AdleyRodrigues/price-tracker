import axios from 'axios';
import { DISCORD_CELULAR_WEBHOOK_URL, USER_ID } from '../config/env';
import { CEP, TAMANHO_PODIO_CELULAR, THRESHOLD_ALERTA_CRITICO_CELULAR } from '../config/regras-celular';
import { podio } from '../domain/ranking';
import { formatBRL } from '../lib/preco';
import { corDoVencedor } from './discord';
import { Oferta } from '../types/oferta';
import { extrairHardwareCelular, formatarBadgeHardwareCelular } from '../domain/hardware';

export function formatarItemFieldCelular(o: Oferta, index: number): { name: string; value: string; inline: boolean } {
  const medalhas = ['🥇 1º', '🥈 2º', '🥉 3º', '🎖️ 4º', '🎖️ 5º', '6º', '7º', '8º', '9º', '10º'];
  const freteTxt = o.frete === 0 ? 'frete grátis' : `frete ${formatBRL(o.frete)}`;
  const badgeHw = formatarBadgeHardwareCelular(o.titulo);

  let linhas: string[] = [
    `${o.titulo}`,
  ];

  if (badgeHw) {
    linhas.push(badgeHw);
  }

  linhas.push(`💵 À vista: ${formatBRL(o.precoAVista)} + ${freteTxt} = **Total: ${formatBRL(o.precoTotal)}**`);

  if (o.precoParcelado || o.detalhesParcelamento) {
    const txtParc = o.detalhesParcelamento
      ? `${o.detalhesParcelamento}`
      : `${formatBRL(o.precoParcelado!)}`;
    linhas.push(`💳 Parcelado: ${formatBRL(o.precoParcelado ?? o.precoAVista)} (${txtParc})`);
  }

  if (o.cupomTag) {
    const descCupomTxt = o.cupomDesconto && o.cupomDesconto > 0 ? ` [Economia: -${formatBRL(o.cupomDesconto)}]` : '';
    const txtCupomPreco = o.precoComCupom
      ? ` (Total c/ cupom: **${formatBRL(o.precoComCupom)}**)`
      : '';
    linhas.push(`🎟️ Cupom: \`${o.cupomTag}\`${descCupomTxt}${txtCupomPreco}`);
  }

  linhas.push(`🔗 [Ver oferta](${o.url})`);

  return {
    name: `${medalhas[index] || `${index + 1}º`} — ${o.loja}`,
    value: linhas.join('\n'),
    inline: false,
  };
}

export function montarPayloadDiscordCelular(
  ofertas: Oferta[],
  userId = USER_ID,
  cep = CEP,
  tamanho = TAMANHO_PODIO_CELULAR
) {
  const melhor = ofertas[0];
  if (!melhor) return null;

  const lugares = podio(ofertas, tamanho);
  const fields = lugares.map((o, i) => formatarItemFieldCelular(o, i));
  const menorPrecoEfetivo = melhor.precoComCupom ?? melhor.precoTotal;
  const ehAlertaCritico = menorPrecoEfetivo <= THRESHOLD_ALERTA_CRITICO_CELULAR;
  const mencao = ehAlertaCritico ? `<@${userId}> 🚨 **OPORTUNIDADE ABAIXO DE ${formatBRL(THRESHOLD_ALERTA_CRITICO_CELULAR)}!**\n` : '';

  return {
    content: `${mencao}📱 Pódio de Ofertas (Top ${lugares.length}) — Celulares Xiaomi & Poco.`,
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

  console.log(`\n📱 [PÓDIO CONSOLIDADO CELULARES (XIAOMI & POCO) TOP ${lugares.length}]`);
  lugares.forEach((o, i) => {
    const hw = extrairHardwareCelular(o.titulo);
    const hwTxt = hw ? [hw.modelo, hw.storage, hw.ram, hw.camera, hw.versao].filter(Boolean).join(' | ') : '';
    const cupomTxt = o.cupomTag ? ` [🎟️ Cupom: ${o.cupomTag} => Total c/ cupom ${formatBRL(o.precoComCupom ?? o.precoTotal)}]` : '';
    console.log(
      `  ${medalhas[i] || `${i + 1}º`} ${o.loja} — à vista ${formatBRL(o.precoAVista)}${cupomTxt}\n     ${hwTxt ? `[${hwTxt}]\n     ` : ''}${o.titulo}\n     Link: ${o.url}`
    );
  });

  try {
    await axios.post(url, payload);
    console.log(`\n✅ Notificação de Celular (Top ${lugares.length}) enviada ao Discord (#celular) com sucesso.`);
  } catch (err: any) {
    const status = err.response?.status ?? 'Erro de rede';
    const statusText = err.response?.statusText ?? 'Falha na comunicação';
    console.warn(`\n⚠️ Falha ao entregar mensagem no Discord (#celular): ${status} (${statusText}).`);
  }
}
