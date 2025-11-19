import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server';

export async function GET() {
  console.log('\n🌐 API /api/debug - REQUEST');
  
  try {
    const collection = await getCollection();
    
    // Obtener una muestra
    const sample = await collection.findOne({});
    
    // Contar total de documentos
    const totalDocs = await collection.countDocuments();
    
    // Obtener estadísticas de las partes
    const parts = await collection.distinct('Parte (Division)');
    
    console.log('📊 Estadísticas de la DB:');
    console.log(`  - Total documentos: ${totalDocs}`);
    console.log(`  - Partes únicas: ${parts.length}`);
    console.log('  - Campos del primer documento:', sample ? Object.keys(sample) : []);
    
    return NextResponse.json({
      success: true,
      stats: {
        totalDocuments: totalDocs,
        uniqueParts: parts.length,
        parts: parts
      },
      fieldNames: sample ? Object.keys(sample) : [],
      sample: sample
    });
  } catch (error) {
    console.error('❌ API /api/debug - ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error'
    }, { status: 500 });
  }
}