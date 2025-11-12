import sqlite3 from "sqlite3";
import { open } from "sqlite";

export default async function handler(req, res) {
  const db = await open({ filename: "./desglose_torres.db", driver: sqlite3.Database });
  
  const filters = {
    TIPO: req.query.TIPO?.trim() || "",
    FABRICANTE: req.query.FABRICANTE?.trim() || "",
    CABEZA: req.query.CABEZA?.trim() || "",
    CUERPO: req.query.CUERPO?.trim() || "",
    TRAMO: req.query.TRAMO?.trim() || "",
  };

  const fieldsToQuery = ["TIPO", "FABRICANTE", "CABEZA", "CUERPO", "PARTE_DIVISION", "TRAMO"];
  const options = {};

  try {
    for (const field of fieldsToQuery) {
      let query = `SELECT DISTINCT TRIM(${field}) as val FROM piezas WHERE ${field} IS NOT NULL AND TRIM(${field}) != ''`;
      const params = [];

      for (const [key, value] of Object.entries(filters)) {
        if (value && key !== field) {
          query += ` AND ${key} = ?`;
          params.push(value);
        }
      }

      query += ` ORDER BY ${field}`;
      const rows = await db.all(query, params);
      options[field] = rows.map(r => r.val);
    }

    res.json({ success: true, options });
  } catch (error) {
    console.error("Error en /api/options:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  } finally {
    await db.close();
  }
}
