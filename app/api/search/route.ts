export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { searchPieces } from '@/lib/server';

export async function GET(request: Request) {
  console.log('\n🌐 API /api/search - REQUEST');
  
  try {
    const {searchParams} = new URL(request.url);
    
    const filters: Record<string, string> = {
      tipo: searchParams.get('tipo') || '',
      fabricante: searchParams.get('fabricante') || '',
      cabeza: searchParams.get('cabeza') || '',
      parte: searchParams.get('parte') || '',
      cuerpo: searchParams.get('cuerpo') || '',
      tramo: searchParams.get('tramo') || ''
    };
    
    console.log('📥 Filtros de búsqueda:', filters);
    
    const pieces = await searchPieces(filters);
    
    console.log(`✅ API /api/search - RESPONSE: ${pieces.length} piezas\n`);
    
    return NextResponse.json({
      success: true,
      count: pieces.length,
      results: pieces
    });
  } catch (error) {
    console.error('❌ API /api/search - ERROR:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor al buscar datos.'
      },
      { status: 500 }
    );
  }
}
