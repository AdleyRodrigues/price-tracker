import sqlite3

db = sqlite3.connect("data/historico.db")
cur = db.cursor()
before = cur.execute(
    """
    SELECT COUNT(*) FROM price_snapshots
    WHERE modulo = 'notebooks' AND (
      produto_chave LIKE 'g16%'
      OR produto_chave LIKE 'm16%'
      OR lower(titulo) LIKE '%strix%'
      OR lower(titulo) LIKE '% g16%'
    )
    """
).fetchone()[0]
print("candidatos", before)
cur.execute(
    """
    DELETE FROM price_snapshots
    WHERE modulo = 'notebooks' AND (
      produto_chave LIKE 'g16%'
      OR produto_chave LIKE 'm16%'
      OR lower(titulo) LIKE '%strix%'
      OR lower(titulo) LIKE '% g16%'
    )
    """
)
db.commit()
print("deletados", cur.rowcount)
rows = cur.execute(
    """
    SELECT produto_chave, COUNT(*) n
    FROM price_snapshots WHERE modulo='notebooks'
    GROUP BY produto_chave ORDER BY n DESC
    """
).fetchall()
for r in rows:
    print(f"  {r[1]}\t{r[0]}")
db.close()
