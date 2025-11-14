import { NextRequest, NextResponse } from 'next/server';
import { getOptions } from '@/lib/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters: Record<string, string> = {
      TIPO: searchParams.get('TIPO') || '',
      FABRICANTE: searchParams.get('FABRICANTE') || '',
      CABEZA: searchParams.get('CABEZA') || '',
      CUERPO: searchParams.get('CUERPO') || '',
      TRAMO: searchParams.get('TRAMO') || ''
    };
    
    const options = await getOptions(filters);
    
    return NextResponse.json({
      success: true,
      options
    });
  } catch (error) {
    console.error('Error al obtener opciones:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor al obtener opciones.'
      },
      { status: 500 }
    );
  }
}