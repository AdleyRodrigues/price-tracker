import sqlite3

db = sqlite3.connect("data/historico.db")
cur = db.cursor()

mods = cur.execute("SELECT DISTINCT modulo FROM price_snapshots").fetchall()
print("modulos:", mods)

print("\n=== notebooks por chave (menor preco) ===")
rows = cur.execute(
    """
    SELECT produto_chave,
           MIN(preco_avista) as min_preco,
           (SELECT titulo FROM price_snapshots p2
              WHERE p2.produto_chave = p1.produto_chave
                AND p2.modulo = p1.modulo
              ORDER BY preco_avista ASC, coletado_em DESC LIMIT 1) as titulo_ex,
           COUNT(*) as n,
           MAX(coletado_em) as ultima
    FROM price_snapshots p1
    WHERE modulo = 'notebooks' AND produto_chave IS NOT NULL
    GROUP BY produto_chave
    ORDER BY min_preco ASC
    """
).fetchall()

for r in rows:
    print(f"{r[0]}\tR$ {r[1]:.2f}\tn={r[3]}\tultima={r[4]}\t{(r[2] or '')[:110]}")

print(f"\ntotal SKUs: {len(rows)}")
