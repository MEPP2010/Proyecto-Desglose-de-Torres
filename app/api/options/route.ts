import { NextRequest, NextResponse } from 'next/server';
import { getOptions } from '@/lib/server';

export async function GET(request: Request) {
  console.log('\n🌐 API /api/options - REQUEST');
  
  const {searchParams} = new URL(request.url);

  const query = searchParams.get('query');
  
  try {
    const filters: Record<string, string> = {
      TIPO: searchParams.get('TIPO') || '',
      FABRICANTE: searchParams.get('FABRICANTE') || '',
      CABEZA: searchParams.get('CABEZA') || '',
      CUERPO: searchParams.get('CUERPO') || '',
      TRAMO: searchParams.get('TRAMO') || ''
    };
    
    console.log('📥 Parámetros recibidos:', filters);
    
    const options = await getOptions(filters);
    
    console.log('✅ API /api/options - RESPONSE SUCCESS\n');
    
    return NextResponse.json({
      success: true,
      options
    });
  } catch (error) {
    console.error('❌ API /api/options - ERROR:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor al obtener opciones.'
      },
      { status: 500 }
    );
  }
}