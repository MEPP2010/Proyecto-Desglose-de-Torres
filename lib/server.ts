import { MongoClient, Db, Collection } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDatabase() {
  if (!db) {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI must be set');
    }
    
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('torres');
  }
  return db;
}

export function getCollection(): Promise<Collection> {
  return getDatabase().then(db => db.collection('piezas'));
}

export interface Piece {
  id_item: string;
  texto_breve: string;
  tipo: string;
  fabricante: string;
  cabeza: string;
  parte_division: string;
  cuerpo: string;
  tramo: string;
  posicion: string;
  descripcion: string;
  long_2_principal: string;
  cantidad_x_torre: number;
  peso_unitario: number;
  plano: string;
  mod_plano: string;
}

export interface CalculatedPiece extends Piece {
  cantidad_original: number;
  cantidad_calculada: number;
  peso_total: number;
}

export const PARTS_DIV_2 = new Set([
  'BGDA', 'BSUP', 'BMED', 'BINF', 'BDER', 'BIZQ', 'BSUP/MED'
]);

export const PARTS_DIV_4 = new Set([
  'PATA 0', 'PATA 0.0', 'PATA 1.5', 'PATA 3', 'PATA 3.0',
  'PATA 4.5', 'PATA 6', 'PATA 6.0', 'PATA 7.5', 'PATA 9', 'PATA 9.0'
]);

export async function getOptions(filters: Record<string, string>) {
  const collection = await getCollection();
  const options: Record<string, string[]> = {};
  
  const fieldMap: Record<string, string> = {
    TIPO: 'tipo',
    FABRICANTE: 'fabricante',
    CABEZA: 'cabeza',
    CUERPO: 'cuerpo',
    PARTE_DIVISION: 'parte_division',
    TRAMO: 'tramo'
  };
  
  for (const [upperField, mongoField] of Object.entries(fieldMap)) {
    const query: Record<string, any> = {};
    
    // Agregar filtros existentes (excepto el campo actual)
    for (const [filterKey, filterValue] of Object.entries(filters)) {
      if (filterValue && filterKey !== upperField) {
        const targetField = fieldMap[filterKey];
        if (targetField) {
          query[targetField] = filterValue;
        }
      }
    }
    
    // Obtener valores únicos
    const values = await collection.distinct(mongoField, {
      ...query,
      [mongoField]: { $ne: null, $ne: '' }
    });
    
    options[upperField] = values
      .filter(v => v && typeof v === 'string')
      .map(v => v.trim())
      .sort();
  }
  
  return options;
}

export async function searchPieces(filters: Record<string, string>) {
  const collection = await getCollection();
  const query: Record<string, any> = {};
  
  const filterMap: Record<string, string> = {
    tipo: 'tipo',
    fabricante: 'fabricante',
    cabeza: 'cabeza',
    parte: 'parte_division',
    cuerpo: 'cuerpo',
    tramo: 'tramo'
  };
  
  for (const [key, mongoField] of Object.entries(filterMap)) {
    if (filters[key]) {
      if (key === 'tramo') {
        // Búsqueda case-insensitive para tramo
        query[mongoField] = new RegExp(`^${filters[key]}$`, 'i');
      } else {
        query[mongoField] = filters[key];
      }
    }
  }
  
  const pieces = await collection
    .find(query)
    .limit(500)
    .toArray();
  
  return pieces as unknown as Piece[];
}

export async function calculateMaterials(
  filters: Record<string, string>,
  parts: Array<{ part: string; quantity: number }>
) {
  const collection = await getCollection();
  const query: Record<string, any> = {};
  
  if (filters.tipo) query.tipo = filters.tipo;
  if (filters.fabricante) query.fabricante = filters.fabricante;
  if (filters.cabeza) query.cabeza = filters.cabeza;
  
  const allPieces = await collection.find(query).toArray();
  const calculatedPieces: CalculatedPiece[] = [];
  
  for (const piece of allPieces) {
    const pieceData = piece as unknown as Piece;
    const parteDiv = (pieceData.parte_division || '').trim().toUpperCase();
    if (!parteDiv) continue;
    
    const cantidadOriginal = Number(pieceData.cantidad_x_torre) || 0;
    let cantidadCalculada = 0;
    
    for (const selectedPart of parts) {
      const partName = (selectedPart.part || '').trim().toUpperCase();
      const partQty = selectedPart.quantity || 0;
      
      if (parteDiv === partName) {
        const isDivPart = PARTS_DIV_2.has(parteDiv) || PARTS_DIV_4.has(parteDiv);
        
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
      const pesoUnitario = Number(pieceData.peso_unitario) || 0;
      const pesoTotal = cantidadCalculada * pesoUnitario;
      
      calculatedPieces.push({
        ...pieceData,
        cantidad_original: cantidadOriginal,
        cantidad_calculada: cantidadCalculada,
        peso_total: pesoTotal
      });
    }
  }
  
  const totalPiezas = calculatedPieces.reduce((sum, p) => sum + p.cantidad_calculada, 0);
  const totalPeso = calculatedPieces.reduce((sum, p) => sum + p.peso_total, 0);
  
  return {
    results: calculatedPieces,
    totals: {
      total_pieces: totalPiezas,
      total_weight: totalPeso
    }
  };
}