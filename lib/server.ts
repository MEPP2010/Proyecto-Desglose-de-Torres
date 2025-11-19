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

export interface CalculatedPiece {
  id_item: string;
  descripcion: string;
  parte_division: string;
  posicion: string;
  cantidad_original: number;
  cantidad_calculada: number;
  peso_unitario: number;
  peso_total: number;
  long_2_principal: string;
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
    TIPO: 'TIPO',
    FABRICANTE: 'FABRICANTE',
    CABEZA: 'Cabeza',
    CUERPO: 'Cuerpo',
    PARTE_DIVISION: 'Parte (Division)',
    TRAMO: 'Tramo'
  };
  
  for (const [upperField, mongoField] of Object.entries(fieldMap)) {
    const query: Record<string, any> = {};
    
    for (const [filterKey, filterValue] of Object.entries(filters)) {
      if (filterValue && filterKey !== upperField) {
        const targetField = fieldMap[filterKey];
        if (targetField) {
          query[targetField] = filterValue;
        }
      }
    }
    
    const values = await collection.distinct(mongoField, {
      ...query,
      [mongoField]: { $nin: [null, ''] }
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
    tipo: 'TIPO',
    fabricante: 'FABRICANTE',
    cabeza: 'Cabeza',
    parte: 'Parte (Division)',
    cuerpo: 'Cuerpo',
    tramo: 'Tramo'
  };
  
  for (const [key, mongoField] of Object.entries(filterMap)) {
    if (filters[key]) {
      if (key === 'tramo') {
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
  
  return pieces.map(p => ({
    id_item: p.ID_Item || '-',
    texto_breve: p.Texto_breve_del_material || '-',
    tipo: p.TIPO || '-',
    fabricante: p.FABRICANTE || '-',
    cabeza: p.Cabeza || '-',
    parte_division: p['Parte (Division)'] || '-',
    cuerpo: p.Cuerpo || '-',
    tramo: p.Tramo || '-',
    posicion: p.Posición || '-',
    descripcion: p.Descripción || '-',
    long_2_principal: p['Long 2 (Principal)'] || '-',
    cantidad_x_torre: p.Cantidad_x_Torre || 0,
    peso_unitario: p.Peso_Unitario || 0,
    plano: p.PLANO || '-',
    mod_plano: p.mod_plano || '-'
  })) as unknown as Piece[];
}

export async function calculateMaterials(
  filters: Record<string, string>,
  parts: Array<{ part: string; quantity: number }>
) {
  const collection = await getCollection();
  const query: Record<string, any> = {};
  
  if (filters.tipo) query.TIPO = filters.tipo;
  if (filters.fabricante) query.FABRICANTE = filters.fabricante;
  if (filters.cabeza) query.Cabeza = filters.cabeza;
  
  const allPieces = await collection.find(query).toArray();
  const calculatedPieces: CalculatedPiece[] = [];
  
  for (const piece of allPieces) {
    const parteDiv = (piece['Parte (Division)'] || '').trim().toUpperCase();
    if (!parteDiv) continue;
    
    const cantidadOriginal = Number(piece.Cantidad_x_Torre) || 0;
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
      const pesoUnitario = Number(piece.Peso_Unitario) || 0;
      const pesoTotal = cantidadCalculada * pesoUnitario;
      
      calculatedPieces.push({
        id_item: piece.ID_Item || '-',
        descripcion: piece.Descripción || '-',
        parte_division: piece['Parte (Division)'] || '-',
        posicion: piece.Posición || '-',
        cantidad_original: cantidadOriginal,
        cantidad_calculada: cantidadCalculada,
        peso_unitario: pesoUnitario,
        peso_total: pesoTotal,
        long_2_principal: piece['Long 2 (Principal)'] || '-'
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