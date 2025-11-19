import { NextRequest, NextResponse } from 'next/server';
import { calculateMaterials } from '@/lib/server';

export async function POST(request: NextRequest) {
  console.log('\n🌐 API /api/calculate - REQUEST (POST)');
  
  try {
    const body = await request.json();
    const { filters = {}, parts = [] } = body;
    
    console.log('📥 Body recibido:', {
      filters,
      parts,
      partsCount: parts.length
    });
    
    if (!parts || parts.length === 0) {
      console.log('⚠️ No hay partes seleccionadas');
      return NextResponse.json(
        {
          success: false,
          message: 'Debe seleccionar al menos una parte'
        },
        { status: 400 }
      );
    }
    
    const result = await calculateMaterials(filters, parts);
    
    console.log(`✅ API /api/calculate - RESPONSE: ${result.results.length} piezas calculadas\n`);
    
    return NextResponse.json({
      success: true,
      count: result.results.length,
      results: result.results,
      totals: result.totals
    });
  } catch (error) {
    console.error('❌ API /api/calculate - ERROR:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Error al calcular materiales: ${error instanceof Error ? error.message : 'Error desconocido'}`
      },
      { status: 500 }
    );
  }
}