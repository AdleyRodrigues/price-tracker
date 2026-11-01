import axios from 'axios';
import { DISCORD_CELULAR_WEBHOOK_URL, USER_ID } from '../config/env';
import { CEP, TAMANHO_PODIO_CELULAR, THRESHOLD_ALERTA_CRITICO_CELULAR } from '../config/regras-celular';
import { podio } from '../domain/ranking';
import { formatBRL } from '../lib/preco';
import { Oferta } from '../types/oferta';
import { extrairHardwareCelular, formatarBadgeHardwareCelular } from '../domain/hardware';
import { separarOfertasCelular } from '../domain/filtros-celular';

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

export function montarEmbedCategoriaCelular(
  ofertas: Oferta[],
  categoria: 'poco' | 'xiaomi',
  cep = CEP,
  tamanho = TAMANHO_PODIO_CELULAR
) {
  const lugares = podio(ofertas, tamanho);
  if (lugares.length === 0) return null;

  const melhor = lugares[0];
  const menorPrecoEfetivo = melhor.precoComCupom ?? melhor.precoTotal;
  const fields = lugares.map((o, i) => formatarItemFieldCelular(o, i));

  if (categoria === 'poco') {
    return {
      title: `📱 Top ${lugares.length} — Poco X8 Pro Max`,
      url: melhor.url,
      description:
        `Comparativo Poco X8 Pro Max (Top ${lugares.length}) para o CEP **${cep}**.\n` +
        `Melhor oferta: **${melhor.loja}** por **${formatBRL(menorPrecoEfetivo)}**\n\n` +
        `${melhor.titulo}`,
      color: 0xfac800, // Amarelo Poco
      fields,
      footer: {
        text: `CEP ${cep} • Poco X8 Pro Max`,
      },
      timestamp: new Date().toISOString(),
    };
  }

  return {
    title: `📱 Top ${lugares.length} — Xiaomi 15T Pro & 17T Pro`,
    url: melhor.url,
    description:
      `Comparativo Xiaomi Linha T (Top ${lugares.length}) para o CEP **${cep}**.\n` +
      `Melhor oferta: **${melhor.loja}** por **${formatBRL(menorPrecoEfetivo)}**\n\n` +
      `${melhor.titulo}`,
    color: 0xff6900, // Laranja Xiaomi
    fields,
    footer: {
      text: `CEP ${cep} • Xiaomi 15T Pro / 17T Pro • ${new Date().toLocaleString('pt-BR')}`,
    },
    timestamp: new Date().toISOString(),
  };
}

export function montarPayloadDiscordCelular(
  ofertasInput: Oferta[] | { poco: Oferta[]; xiaomi: Oferta[] },
  userId = USER_ID,
  cep = CEP,
  tamanho = TAMANHO_PODIO_CELULAR
) {
  let poco: Oferta[] = [];
  let xiaomi: Oferta[] = [];

  if (Array.isArray(ofertasInput)) {
    const separadas = separarOfertasCelular(ofertasInput);
    poco = separadas.poco;
    xiaomi = separadas.xiaomi;

    if (poco.length === 0 && xiaomi.length === 0 && ofertasInput.length > 0) {
      xiaomi = ofertasInput;
    }
  } else {
    poco = ofertasInput.poco || [];
    xiaomi = ofertasInput.xiaomi || [];
  }

  const embedPoco = montarEmbedCategoriaCelular(poco, 'poco', cep, tamanho);
  const embedXiaomi = montarEmbedCategoriaCelular(xiaomi, 'xiaomi', cep, tamanho);

  const embeds = [embedPoco, embedXiaomi].filter(Boolean) as any[];
  if (embeds.length === 0) return null;

  const todasOfertas = [...podio(poco, tamanho), ...podio(xiaomi, tamanho)];
  const menorPrecoEfetivo = Math.min(
    ...todasOfertas.map((o) => o.precoComCupom ?? o.precoTotal)
  );

  const ehAlertaCritico = menorPrecoEfetivo <= THRESHOLD_ALERTA_CRITICO_CELULAR;
  const mencao = ehAlertaCritico
    ? `<@${userId}> 🚨 **OPORTUNIDADE ABAIXO DE ${formatBRL(THRESHOLD_ALERTA_CRITICO_CELULAR)}!**\n`
    : '';

  const resumoTop =
    embedPoco && embedXiaomi
      ? `Top ${podio(poco, tamanho).length} Poco X8 Pro Max + Top ${podio(xiaomi, tamanho).length} Xiaomi 15T/17T Pro`
      : embedPoco
      ? `Top ${podio(poco, tamanho).length} Poco X8 Pro Max`
      : `Top ${podio(xiaomi, tamanho).length} Xiaomi (15T Pro | 17T Pro)`;

  return {
    content: `${mencao}📊 Pódio de Ofertas (${resumoTop}) — Celulares Xiaomi & Poco.`,
    embeds,
  };
}

export async function enviarParaDiscordCelular(
  ofertasInput: Oferta[] | { poco: Oferta[]; xiaomi: Oferta[] }
): Promise<void> {
  const url = DISCORD_CELULAR_WEBHOOK_URL?.trim();
  if (!url) {
    console.error('DISCORD_CELULAR_WEBHOOK_URL não configurado.');
    return;
  }

  const payload = montarPayloadDiscordCelular(ofertasInput);
  if (!payload) {
    console.error('Nenhuma oferta para enviar.');
    return;
  }

  let poco: Oferta[] = [];
  let xiaomi: Oferta[] = [];
  if (Array.isArray(ofertasInput)) {
    const sep = separarOfertasCelular(ofertasInput);
    poco = sep.poco;
    xiaomi = sep.xiaomi;
    if (poco.length === 0 && xiaomi.length === 0) xiaomi = ofertasInput;
  } else {
    poco = ofertasInput.poco || [];
    xiaomi = ofertasInput.xiaomi || [];
  }

  const medalhas = ['🥇 1º', '🥈 2º', '🥉 3º', '🎖️ 4º', '🎖️ 5º', '6º', '7º', '8º', '9º', '10º'];

  if (poco.length > 0) {
    const lugaresPoco = podio(poco, TAMANHO_PODIO_CELULAR);
    console.log(`\n📱 [PÓDIO POCO X8 PRO MAX (TOP ${lugaresPoco.length})]`);
    lugaresPoco.forEach((o, i) => {
      const hw = extrairHardwareCelular(o.titulo);
      const hwTxt = hw ? [hw.modelo, hw.storage, hw.ram, hw.camera, hw.versao].filter(Boolean).join(' | ') : '';
      const cupomTxt = o.cupomTag ? ` [🎟️ Cupom: ${o.cupomTag} => Total c/ cupom ${formatBRL(o.precoComCupom ?? o.precoTotal)}]` : '';
      console.log(
        `  ${medalhas[i] || `${i + 1}º`} ${o.loja} — à vista ${formatBRL(o.precoAVista)}${cupomTxt}\n     ${hwTxt ? `[${hwTxt}]\n     ` : ''}${o.titulo}\n     Link: ${o.url}`
      );
    });
  }

  if (xiaomi.length > 0) {
    const lugaresXiaomi = podio(xiaomi, TAMANHO_PODIO_CELULAR);
    console.log(`\n📱 [PÓDIO XIAOMI 15T PRO & 17T PRO (TOP ${lugaresXiaomi.length})]`);
    lugaresXiaomi.forEach((o, i) => {
      const hw = extrairHardwareCelular(o.titulo);
      const hwTxt = hw ? [hw.modelo, hw.storage, hw.ram, hw.camera, hw.versao].filter(Boolean).join(' | ') : '';
      const cupomTxt = o.cupomTag ? ` [🎟️ Cupom: ${o.cupomTag} => Total c/ cupom ${formatBRL(o.precoComCupom ?? o.precoTotal)}]` : '';
      console.log(
        `  ${medalhas[i] || `${i + 1}º`} ${o.loja} — à vista ${formatBRL(o.precoAVista)}${cupomTxt}\n     ${hwTxt ? `[${hwTxt}]\n     ` : ''}${o.titulo}\n     Link: ${o.url}`
      );
    });
  }

  try {
    await axios.post(url, payload);
    console.log(`\n✅ Notificação de Celular (Top Poco + Top Xiaomi) enviada ao Discord (#celular) com sucesso.`);
  } catch (err: any) {
    const status = err.response?.status ?? 'Erro de rede';
    const statusText = err.response?.statusText ?? 'Falha na comunicação';
    console.warn(`\n⚠️ Falha ao entregar mensagem no Discord (#celular): ${status} (${statusText}).`);
  }
}
