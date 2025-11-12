import sqlite3 from "sqlite3";
import { open } from "sqlite";

export default async function handler(req, res) {
  const db = await open({ filename: "./desglose_torres.db", driver: sqlite3.Database });

  const { tipo, fabricante, cabeza, parte, cuerpo, tramo } = req.query;
  let query = "SELECT * FROM piezas WHERE 1=1";
  const params = [];

  if (tipo) { query += " AND TIPO = ?"; params.push(tipo); }
  if (fabricante) { query += " AND FABRICANTE = ?"; params.push(fabricante); }
  if (cabeza) { query += " AND CABEZA = ?"; params.push(cabeza); }
  if (parte) { query += " AND PARTE_DIVISION = ?"; params.push(parte); }
  if (cuerpo) { query += " AND CUERPO = ?"; params.push(cuerpo); }
  if (tramo) { query += " AND TRIM(UPPER(TRAMO)) = TRIM(UPPER(?))"; params.push(tramo); }

  query += " LIMIT 500";

  try {
    const rows = await db.all(query, params);
    res.json({ success: true, count: rows.length, results: rows });
  } catch (error) {
    console.error("Error en /api/search:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  } finally {
    await db.close();
  }
}
