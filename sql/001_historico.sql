-- Histórico de preços (Turso / libSQL)
-- Compatível com v1 (celular) e v2 (notebooks) via coluna modulo.

CREATE TABLE IF NOT EXISTS price_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  modulo TEXT NOT NULL,
  produto_chave TEXT NOT NULL,
  loja TEXT NOT NULL,
  titulo TEXT NOT NULL,
  preco_avista REAL NOT NULL,
  preco_total REAL NOT NULL,
  frete REAL NOT NULL DEFAULT 0,
  url TEXT NOT NULL,
  fonte_id TEXT,
  coletado_em TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_produto_tempo
  ON price_snapshots (produto_chave, coletado_em);

CREATE INDEX IF NOT EXISTS idx_snapshots_loja_tempo
  ON price_snapshots (loja, coletado_em);

CREATE INDEX IF NOT EXISTS idx_snapshots_modulo_tempo
  ON price_snapshots (modulo, coletado_em);

CREATE INDEX IF NOT EXISTS idx_snapshots_modulo_produto
  ON price_snapshots (modulo, produto_chave, coletado_em);
