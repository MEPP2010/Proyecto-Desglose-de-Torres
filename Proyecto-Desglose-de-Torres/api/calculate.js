import sqlite3 from "sqlite3";
import { open } from "sqlite";

const PARTS_DIV_2 = new Set(['BGDA', 'BSUP', 'BMED', 'BINF', 'BDER', 'BIZQ', 'BSUP/MED']);
const PARTS_DIV_4 = new Set(['PATA 0', 'PATA 1.5', 'PATA 3', 'PATA 4.5', 'PATA 6', 'PATA 7.5', 'PATA 9']);

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, message: "Método no permitido" });

  try {
    const db = await open({ filename: "./desglose_torres.db", driver: sqlite3.Database });
    const { filters, parts } = req.body;

    if (!parts?.length)
      return res.status(400).json({ success: false, message: "Debe seleccionar al menos una parte" });

    let query = "SELECT * FROM piezas WHERE 1=1";
    const params = [];

    if (filters.tipo) { query += " AND TIPO = ?"; params.push(filters.tipo); }
    if (filters.fabricante) { query += " AND FABRICANTE = ?"; params.push(filters.fabricante); }
    if (filters.cabeza) { query += " AND CABEZA = ?"; params.push(filters.cabeza); }

    const rows = await db.all(query, params);
    const results = [];

    for (const piece of rows) {
      const parte = (piece.PARTE_DIVISION || "").trim().toUpperCase();
      if (!parte) continue;

      let cantidad_original = Number(piece.CANTIDAD_X_TORRE || 0);
      let cantidad_calculada = 0;

      for (const selected of parts) {
        const nombre = selected.part?.trim().toUpperCase();
        const qty = Number(selected.quantity || 0);
        if (nombre === parte) {
          if (PARTS_DIV_2.has(parte)) cantidad_calculada += (cantidad_original * qty) / 2;
          else if (PARTS_DIV_4.has(parte)) cantidad_calculada += (cantidad_original * qty) / 4;
          else cantidad_calculada += cantidad_original * qty;
        }
      }

      if (cantidad_calculada > 0) {
        const peso_unit = Number(piece.PESO_UNITARIO || 0);
        const peso_total = cantidad_calculada * peso_unit;
        results.push({ ...piece, CANTIDAD_ORIGINAL: cantidad_original, CANTIDAD_CALCULADA: cantidad_calculada, PESO_TOTAL: peso_total });
      }
    }

    const total_pieces = results.reduce((a, b) => a + b.CANTIDAD_CALCULADA, 0);
    const total_weight = results.reduce((a, b) => a + b.PESO_TOTAL, 0);

    res.json({ success: true, count: results.length, results, totals: { total_pieces, total_weight } });
    await db.close();
  } catch (error) {
    console.error("Error en /api/calculate:", error);
    res.status(500).json({ success: false, message: "Error al calcular materiales" });
  }
}
