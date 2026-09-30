import axios from 'axios';
import { USER_ID, WEBHOOK_URL } from '../config/env';
import { CEP, TAMANHO_PODIO, THRESHOLD_ALERTA_CRITICO } from '../config/regras';
import { podio } from '../domain/ranking';
import { formatBRL } from '../lib/preco';
import { Oferta } from '../types/oferta';

export function corDoVencedor(loja: string): number {
  const nome = loja.toLowerCase();
  if (nome.includes('comunidade') || nome.includes('promobit')) return 0xe67e22;
  if (nome.includes('amazon')) return 0xff9900;
  if (nome.includes('lg')) return 0xa50034;
  return 0x2ecc71;
}

export function formatarItemField(o: Oferta, index: number): { name: string; value: string; inline: boolean } {
  const medalhas = ['🥇 1º', '🥈 2º', '🥉 3º', '🎖️ 4º', '🎖️ 5º', '6º', '7º', '8º', '9º', '10º'];
  const freteTxt = o.frete === 0 ? 'frete grátis' : `frete ${formatBRL(o.frete)}`;

  let linhas: string[] = [
    `${o.titulo}`,
    `💵 À vista: ${formatBRL(o.precoAVista)} + ${freteTxt} = **Total: ${formatBRL(o.precoTotal)}**`,
  ];

  if (o.precoParcelado || o.detalhesParcelamento) {
    const txtParc = o.detalhesParcelamento
      ? `${o.detalhesParcelamento}`
      : `${formatBRL(o.precoParcelado!)}`;
    linhas.push(`💳 Parcelado: ${formatBRL(o.precoParcelado ?? o.precoAVista)} (${txtParc})`);
  }

  if (o.cupomTag) {
    const txtCupomPreco = o.precoComCupom
      ? ` (Total c/ cupom: **${formatBRL(o.precoComCupom)}**)`
      : '';
    linhas.push(`🎟️ Cupom: \`${o.cupomTag}\`${txtCupomPreco}`);
  }

  linhas.push(`🔗 [Ver oferta](${o.url})`);

  return {
    name: `${medalhas[index] || `${index + 1}º`} — ${o.loja}`,
    value: linhas.join('\n'),
    inline: false,
  };
}

export function gerarRankingTexto(lugares: Oferta[]): string {
  return lugares.map((o, i) => `**${formatarItemField(o, i).name}**\n${formatarItemField(o, i).value}`).join('\n\n');
}

export function montarPayloadDiscord(
  ofertas: Oferta[],
  userId = USER_ID,
  cep = CEP,
  tamanho = TAMANHO_PODIO
) {
  const melhor = ofertas[0];
  if (!melhor) return null;

  const lugares = podio(ofertas, tamanho);
  const fields = lugares.map((o, i) => formatarItemField(o, i));
  const menorPrecoEfetivo = melhor.precoComCupom ?? melhor.precoTotal;
  const ehAlertaCritico = menorPrecoEfetivo <= THRESHOLD_ALERTA_CRITICO;
  const mencao = ehAlertaCritico ? `<@${userId}> 🚨 **OPORTUNIDADE ASUS TUF ABAIXO DE ${formatBRL(THRESHOLD_ALERTA_CRITICO)}!**\n` : '';

  return {
    content: `${mencao}Pódio atualizado (Top ${lugares.length}) — ASUS TUF (RTX 4060 / 5050 / 5060).`,
    embeds: [
      {
        title: '💻 Monitor ASUS TUF (RTX 4060 / 5050 / 5060)',
        url: melhor.url,
        description:
          `Comparativo ASUS TUF Gamer (Top ${lugares.length}) para o CEP **${cep}**.\n` +
          `Melhor oferta: **${melhor.loja}** por **${formatBRL(menorPrecoEfetivo)}**\n` +
          `Fontes em paralelo: Amazon e Comunidade (Promobit).\n\n` +
          `${melhor.titulo}`,
        color: corDoVencedor(melhor.loja),
        fields,
        footer: {
          text: `CEP ${cep} • ${new Date().toLocaleString('pt-BR')}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export async function enviarParaDiscord(ofertas: Oferta[]): Promise<void> {
  const payload = montarPayloadDiscord(ofertas);
  if (!payload) {
    console.error('Nenhuma oferta para enviar.');
    return;
  }

  const medalhas = ['🥇 1º', '🥈 2º', '🥉 3º', '🎖️ 4º', '🎖️ 5º', '6º', '7º', '8º', '9º', '10º'];
  const lugares = podio(ofertas, TAMANHO_PODIO);

  console.log(`\n📋 [PÓDIO CONSOLIDADO TOP ${lugares.length}]`);
  lugares.forEach((o, i) => {
    console.log(
      `  ${medalhas[i] || `${i + 1}º`} ${o.loja} — à vista ${formatBRL(o.precoAVista)} + frete ${formatBRL(o.frete)} = ${formatBRL(o.precoTotal)}${o.cupomTag ? ` [Cupom: ${o.cupomTag}]` : ''}\n     ${o.titulo}\n     Link: ${o.url}`
    );
  });

  try {
    await axios.post(WEBHOOK_URL, payload);
    console.log(`\n✅ Notificação (Top ${lugares.length}) enviada ao Discord com sucesso.`);
  } catch (err: any) {
    const status = err.response?.status ?? 'Erro de rede';
    const statusText = err.response?.statusText ?? 'Falha na comunicação';
    console.warn(`\n⚠️ Falha ao entregar mensagem no Discord: ${status} (${statusText}). URL omitida por segurança.`);
  }
}
