import { NextRequest, NextResponse } from 'next/server';
import { calculateMaterials } from '@/lib/server';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters = {}, parts = [] } = body;
    
    if (!parts || parts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Debe seleccionar al menos una parte'
        },
        { status: 400 }
      );
    }
    
    const result = await calculateMaterials(filters, parts);
    
    return NextResponse.json({
      success: true,
      count: result.results.length,
      results: result.results,
      totals: result.totals
    });
  } catch (error) {
    console.error('Error en el cálculo:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Error al calcular materiales: ${error instanceof Error ? error.message : 'Error desconocido'}`
      },
      { status: 500 }
    );
  }
}