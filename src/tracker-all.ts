import { spawn } from 'child_process';
import path from 'path';

interface TarefaTracker {
  nome: string;
  arquivo: string;
  descricao: string;
}

const TAREFAS: TarefaTracker[] = [
  {
    nome: 'Notebooks TUF Gamers (Top 10 + Loja ASUS + QNC)',
    arquivo: 'src/tracker.ts',
    descricao: 'Rastreamento de notebooks ASUS TUF Gaming 16:10 com RTX 4060/5050/5060 (sem V16)',
  },
  {
    nome: 'Smartphones (Xiaomi 17T Pro)',
    arquivo: 'src/tracker-celular.ts',
    descricao: 'Rastreamento de smartphones Xiaomi 17T Pro e Linha T',
  },
  {
    nome: 'Supermercado (>35% OFF)',
    arquivo: 'src/tracker-supermercado.ts',
    descricao: 'Achados de supermercado no Mercado Livre',
  },
];

const repoRoot = path.resolve(__dirname, '..');
const tsNodeJs = path.join(repoRoot, 'node_modules', 'ts-node', 'dist', 'bin.js');

async function executarTracker(tarefa: TarefaTracker, index: number, total: number): Promise<boolean> {
  console.log('\n' + '='.repeat(70));
  console.log(`[ORQUESTRADOR ${index}/${total}] Iniciando: ${tarefa.nome}`);
  console.log(`Descricao: ${tarefa.descricao}`);
  console.log('='.repeat(70) + '\n');

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [tsNodeJs, tarefa.arquivo], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n[ORQUESTRADOR] Concluido com sucesso: ${tarefa.nome}\n`);
        resolve(true);
      } else {
        console.error(`\n[ORQUESTRADOR] Falha na execucao (${tarefa.nome}) com codigo ${code}\n`);
        resolve(false);
      }
    });

    child.on('error', (err) => {
      console.error(`\n[ORQUESTRADOR] Erro ao disparar ${tarefa.nome}: ${err.message}\n`);
      resolve(false);
    });
  });
}

async function main(): Promise<void> {
  console.log('======================================================================');
  console.log('      INICIANDO VARREDURA COMPLETA DE TODOS OS BOTS / RASTREADORES    ');
  console.log('======================================================================');

  const inicio = Date.now();
  const resultados: { nome: string; sucesso: boolean }[] = [];

  for (let i = 0; i < TAREFAS.length; i++) {
    const tarefa = TAREFAS[i];
    const sucesso = await executarTracker(tarefa, i + 1, TAREFAS.length);
    resultados.push({ nome: tarefa.nome, sucesso });
  }

  const duracaoSeg = Math.round((Date.now() - inicio) / 1000);
  console.log('\n' + '='.repeat(70));
  console.log(`      RESUMO DA VARREDURA GERAL (${duracaoSeg}s)`);
  console.log('='.repeat(70));

  for (const r of resultados) {
    const status = r.sucesso ? '[OK] SUCESSO' : '[FALHA] ERRO';
    console.log(`  ${status} -> ${r.nome}`);
  }
  console.log('='.repeat(70) + '\n');
}

main().catch((err) => {
  console.error('Erro no orquestrador:', err);
  process.exit(1);
});
