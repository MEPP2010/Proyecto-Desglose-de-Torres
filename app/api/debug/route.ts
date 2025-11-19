// app/api/debug/route.ts
import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/server';

export async function GET() {
  try {
    const collection = await getCollection();
    const sample = await collection.findOne({});
    
    return NextResponse.json({
      success: true,
      fieldNames: sample ? Object.keys(sample) : [],
      sample: sample
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error'
    }, { status: 500 });
  }
}