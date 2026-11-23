-- Cupom aplicado no preço à vista (quando enriquecimento CupomDescontos/scraper aplica desconto).
ALTER TABLE price_snapshots ADD COLUMN cupom_tag TEXT;
ALTER TABLE price_snapshots ADD COLUMN cupom_desconto REAL;
