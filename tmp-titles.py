import sqlite3

db = sqlite3.connect("data/historico.db")
cur = db.cursor()

for chave in ["fx608jhr", "fx608jhi", "fx608jmi", "fa607nv", "a16_rtx5060_16gb", "g16_rtx5060_32gb"]:
    print("\n===", chave, "===")
    rows = cur.execute(
        """
        SELECT preco_avista, titulo
        FROM price_snapshots
        WHERE produto_chave = ? AND modulo = 'notebooks'
        ORDER BY preco_avista ASC
        LIMIT 3
        """,
        (chave,),
    ).fetchall()
    for p, t in rows:
        print(f"  R$ {p:.2f} | {t[:140]}")
