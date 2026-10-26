export interface HardwareInfo {
  gpu: string | null;
  cpu: string | null;
  ram: string | null;
  ssd: string | null;
}

export function extrairHardware(titulo: string): HardwareInfo {
  if (!titulo) {
    return { gpu: null, cpu: null, ram: null, ssd: null };
  }

  // 1. GPU (RTX 4060, RTX 5050, RTX 5060, RTX 4050, etc.)
  let gpu: string | null = null;
  const matchGpu = titulo.match(/\b(?:geforce\s+)?rtx[™\s]*(\d{4}(?:\s*ti)?)\b/i);
  if (matchGpu) {
    gpu = 'RTX ' + matchGpu[1].toUpperCase().replace(/\s+/g, '');
  }

  // 2. CPU (Intel Core i5-14450HX, i7-14650HX, Core i5, Core 5, Ryzen 7, etc.)
  let cpu: string | null = null;
  const matchIntelHX = titulo.match(/\b(?:intel\s+)?(?:core\s+)?(i[3579])[- ]*(\d{4,5}[a-z]{0,2})\b/i);
  const matchIntelUltra = titulo.match(/\bcore\s+(ultra\s+[579])(?:[- ]*(\d{3,4}[a-z]{0,2}))?\b/i);
  const matchIntelSeries = titulo.match(/\b(?:intel\s+)?core\s+([3579])[- ]+(\d{3}[a-z]{0,2})\b/i);
  const matchRyzen = titulo.match(/\bryzen\s*([3579])(?:[- ]*(\d{3,5}[a-z]{0,2}))?\b/i);
  const matchSimpleCore = titulo.match(/\b(?:intel\s+)?core\s+(i[3579])\b/i);

  if (matchIntelHX) {
    cpu = 'Core ' + matchIntelHX[1].toLowerCase() + '-' + matchIntelHX[2].toUpperCase();
  } else if (matchIntelUltra) {
    cpu = 'Core ' + matchIntelUltra[1].toUpperCase() + (matchIntelUltra[2] ? '-' + matchIntelUltra[2].toUpperCase() : '');
  } else if (matchIntelSeries) {
    cpu = 'Core ' + matchIntelSeries[1] + '-' + matchIntelSeries[2].toUpperCase();
  } else if (matchRyzen) {
    cpu = 'Ryzen ' + matchRyzen[1] + (matchRyzen[2] ? '-' + matchRyzen[2].toUpperCase() : '');
  } else if (matchSimpleCore) {
    cpu = 'Core ' + matchSimpleCore[1].toLowerCase();
  } else {
    const matchSimpleI = titulo.match(/\b(i[3579])\b/i);
    if (matchSimpleI) cpu = 'Core ' + matchSimpleI[1].toLowerCase();
  }

  // 3. RAM (8 GB, 16 GB, 24 GB, 32 GB)
  let ram: string | null = null;
  const matchRamExplicit =
    titulo.match(/\bram\s*:?\s*(\d{1,2})\s*gb\b/i) ||
    titulo.match(/\b(\d{1,2})\s*gb\s*ram\b/i) ||
    titulo.match(/\b(\d{1,2})\s*gb\s*ddr\d?\b/i);

  if (matchRamExplicit) {
    ram = matchRamExplicit[1] + ' GB RAM';
  } else {
    // Padrão ASUS: "..., 16GB, 512GB, KeepOS..." ou "..., 8 GB, 512 GB SSD, ..."
    const matchRamAsus = titulo.match(/\b(\d{1,2})\s*gb\b(?!\s*ssd)(?=\s*,\s*\d+\s*(?:gb|tb))/i);
    if (matchRamAsus) {
      ram = matchRamAsus[1] + ' GB RAM';
    } else {
      const matchRamGeneric = titulo.match(/\b(8|12|16|24|32|64)\s*gb\b(?!\s*ssd)/i);
      if (matchRamGeneric) {
        ram = matchRamGeneric[1] + ' GB RAM';
      }
    }
  }

  // 4. SSD (512 GB SSD, 1 TB SSD, etc.)
  let ssd: string | null = null;
  const matchSsdExplicit =
    titulo.match(/\b(\d{3,4}\s*gb|\d\s*tb)\s*ssd\b/i) ||
    titulo.match(/\bssd\s*(\d{3,4}\s*gb|\d\s*tb)\b/i);

  if (matchSsdExplicit) {
    ssd = matchSsdExplicit[1].toUpperCase().replace(/\s+/g, ' ') + ' SSD';
  } else {
    const matchSsdAsus = titulo.match(/,\s*(\d{3,4}\s*gb|\d\s*tb)\s*,\s*(?:keepos|windows|linux|w11|tela|16")/i);
    if (matchSsdAsus) {
      ssd = matchSsdAsus[1].toUpperCase().replace(/\s+/g, ' ') + ' SSD';
    }
  }

  return { gpu, cpu, ram, ssd };
}

export function formatarBadgeHardware(titulo: string): string | null {
  const hw = extrairHardware(titulo);
  const partes: string[] = [];

  if (hw.gpu) partes.push('🎮 **GPU:** `' + hw.gpu + '`');
  if (hw.cpu) partes.push('🧠 **CPU:** `' + hw.cpu + '`');
  if (hw.ram) partes.push('⚡ **RAM:** `' + hw.ram + '`');
  if (hw.ssd) partes.push('💾 `' + hw.ssd + '`');

  if (partes.length === 0) return null;
  return '> ' + partes.join('  •  ');
}
