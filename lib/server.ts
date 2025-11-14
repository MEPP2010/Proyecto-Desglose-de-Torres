import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDatabase() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'desglose_torres.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export interface Piece {
  ID_ITEM: string;
  TEXTO_BREVE_DEL_MATERIAL: string;
  TIPO: string;
  FABRICANTE: string;
  CABEZA: string;
  PARTE_DIVISION: string;
  CUERPO: string;
  TRAMO: string;
  POSICION: string;
  DESCRIPCION: string;
  LONG_2_PRINCIPAL: string;
  CANTIDAD_X_TORRE: number;
  PESO_UNITARIO: number;
  PLANO: string;
  MOD_PLANO: string;
}

export interface CalculatedPiece extends Piece {
  CANTIDAD_ORIGINAL: number;
  CANTIDAD_CALCULADA: number;
  PESO_TOTAL: number;
}

// Conjuntos de partes para lógica especial
export const PARTS_DIV_2 = new Set([
  'BGDA', 'BSUP', 'BMED', 'BINF', 'BDER', 'BIZQ', 'BSUP/MED'
]);

export const PARTS_DIV_4 = new Set([
  'PATA 0', 'PATA 0.0', 'PATA 1.5', 'PATA 3', 'PATA 3.0',
  'PATA 4.5', 'PATA 6', 'PATA 6.0', 'PATA 7.5', 'PATA 9', 'PATA 9.0'
]);

export function getOptions(filters: Record<string, string>) {
  const db = getDatabase();
  const options: Record<string, string[]> = {};
  
  const fieldsToQuery = ['TIPO', 'FABRICANTE', 'CABEZA', 'CUERPO', 'PARTE_DIVISION', 'TRAMO'];
  
  for (const field of fieldsToQuery) {
    let query = `SELECT DISTINCT TRIM(${field}) as value FROM piezas WHERE ${field} IS NOT NULL AND TRIM(${field}) != ''`;
    const params: string[] = [];
    
    for (const [filterField, filterValue] of Object.entries(filters)) {
      if (filterValue && filterField !== field) {
        query += ` AND ${filterField} = ?`;
        params.push(filterValue);
      }
    }
    
    query += ` ORDER BY ${field}`;
    
    const stmt = db.prepare(query);
    const results = stmt.all(...params) as { value: string }[];
    options[field] = results.map(r => r.value);
  }
  
  return options;
}

export function searchPieces(filters: Record<string, string>) {
  const db = getDatabase();
  let query = 'SELECT * FROM piezas WHERE 1=1';
  const params: string[] = [];
  
  const filterMap: Record<string, string> = {
    tipo: 'TIPO',
    fabricante: 'FABRICANTE',
    cabeza: 'CABEZA',
    parte: 'PARTE_DIVISION',
    cuerpo: 'CUERPO',
    tramo: 'TRAMO'
  };
  
  for (const [key, dbField] of Object.entries(filterMap)) {
    if (filters[key]) {
      if (key === 'tramo') {
        query += ` AND TRIM(UPPER(${dbField})) = TRIM(UPPER(?))`;
      } else {
        query += ` AND ${dbField} = ?`;
      }
      params.push(filters[key]);
    }
  }
  
  query += ' LIMIT 500';
  
  const stmt = db.prepare(query);
  return stmt.all(...params) as Piece[];
}

export function calculateMaterials(
  filters: Record<string, string>,
  parts: Array<{ part: string; quantity: number }>
) {
  const db = getDatabase();
  let query = 'SELECT * FROM piezas WHERE 1=1';
  const params: string[] = [];
  
  if (filters.tipo) {
    query += ' AND TIPO = ?';
    params.push(filters.tipo);
  }
  if (filters.fabricante) {
    query += ' AND FABRICANTE = ?';
    params.push(filters.fabricante);
  }
  if (filters.cabeza) {
    query += ' AND CABEZA = ?';
    params.push(filters.cabeza);
  }
  
  const stmt = db.prepare(query);
  const allPieces = stmt.all(...params) as Piece[];
  
  const calculatedPieces: CalculatedPiece[] = [];
  
  for (const piece of allPieces) {
    const parteDiv = (piece.PARTE_DIVISION || '').trim().toUpperCase();
    if (!parteDiv) continue;
    
    const cantidadOriginal = Number(piece.CANTIDAD_X_TORRE) || 0;
    let cantidadCalculada = 0;
    
    for (const selectedPart of parts) {
      const partName = (selectedPart.part || '').trim().toUpperCase();
      const partQty = selectedPart.quantity || 0;
      
      if (parteDiv === partName) {
        const isDivPart = PARTS_DIV_2.has(parteDiv) || PARTS_DIV_4.has(parteDiv);
        
        // Validación: Si es una parte divisible PERO su cantidad original es 1, no dividir
        if (isDivPart && cantidadOriginal === 1) {
          cantidadCalculada += cantidadOriginal * partQty;
        } else if (PARTS_DIV_2.has(parteDiv)) {
          cantidadCalculada += (cantidadOriginal * partQty) / 2;
        } else if (PARTS_DIV_4.has(parteDiv)) {
          cantidadCalculada += Math.ceil((cantidadOriginal * partQty) / 4);
        } else if (!isDivPart) {
          cantidadCalculada += cantidadOriginal * partQty;
        }
      }
    }
    
    if (cantidadCalculada > 0) {
      const pesoUnitario = Number(piece.PESO_UNITARIO) || 0;
      const pesoTotal = cantidadCalculada * pesoUnitario;
      
      calculatedPieces.push({
        ...piece,
        CANTIDAD_ORIGINAL: cantidadOriginal,
        CANTIDAD_CALCULADA: cantidadCalculada,
        PESO_TOTAL: pesoTotal
      });
    }
  }
  
  const totalPiezas = calculatedPieces.reduce((sum, p) => sum + p.CANTIDAD_CALCULADA, 0);
  const totalPeso = calculatedPieces.reduce((sum, p) => sum + p.PESO_TOTAL, 0);
  
  return {
    results: calculatedPieces,
    totals: {
      total_pieces: totalPiezas,
      total_weight: totalPeso
    }
  };
}