import { NextRequest, NextResponse } from 'next/server';
import { searchPieces } from '@/lib/server';

export async function GET(request: Request) {
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
    
    const pieces = await searchPieces(filters);
    
    return NextResponse.json({
      success: true,
      count: pieces.length,
      results: pieces
    });
  } catch (error) {
    console.error('Error en la búsqueda:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor al buscar datos.'
      },
      { status: 500 }
    );
  }
}