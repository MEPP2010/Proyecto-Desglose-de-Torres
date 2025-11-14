// migrate-to-mongodb.js
// Ejecuta: node migrate-to-mongodb.js

const Database = require('better-sqlite3');
const { MongoClient } = require('mongodb');

// ⚠️ IMPORTANTE: Reemplaza esto con tu connection string de MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://martinp_db:c51ObWgDOgN1KTOw@desglosetorres.js1iput.mongodb.net//torres?retryWrites=true&w=majority';
async function migrate() {
  console.log('🚀 Iniciando migración de SQLite a MongoDB Atlas...');
  console.log('');
  
  // Verificar que existe el archivo SQLite
  const fs = require('fs');
  if (!fs.existsSync('./desglose_torres.db')) {
    console.error('❌ Error: No se encontró el archivo desglose_torres.db');
    console.error('   Asegúrate de que el archivo esté en la raíz del proyecto');
    process.exit(1);
  }
  
  // Conectar a SQLite
  console.log('📂 Conectando a SQLite...');
  const db = new Database('./desglose_torres.db');
  console.log('✅ Conectado a SQLite');
  
  // Obtener todos los datos
  console.log('📊 Leyendo datos...');
  const pieces = db.prepare('SELECT * FROM piezas').all();
  console.log(`✅ Encontrados ${pieces.length} registros`);
  console.log('');
  
  // Conectar a MongoDB
  console.log('🔌 Conectando a MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB Atlas');
    console.log('');
    
    const database = client.db('torres');
    const collection = database.collection('piezas');
    
    // Verificar si ya hay datos
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Ya existen ${existingCount} documentos en la colección`);
      console.log('🧹 Limpiando colección...');
      await collection.deleteMany({});
      console.log('✅ Colección limpiada');
      console.log('');
    }
    
    // Transformar datos para MongoDB
    console.log('🔄 Transformando datos...');
    const documents = pieces.map(piece => ({
      id_item: piece.ID_ITEM || '',
      texto_breve: piece.TEXTO_BREVE_DEL_MATERIAL || '',
      tipo: piece.TIPO || '',
      fabricante: piece.FABRICANTE || '',
      cabeza: piece.CABEZA || '',
      parte_division: piece.PARTE_DIVISION || '',
      cuerpo: piece.CUERPO || '',
      tramo: piece.TRAMO || '',
      posicion: piece.POSICION || '',
      descripcion: piece.DESCRIPCION || '',
      long_2_principal: piece.LONG_2_PRINCIPAL || '',
      cantidad_x_torre: Number(piece.CANTIDAD_X_TORRE) || 0,
      peso_unitario: Number(piece.PESO_UNITARIO) || 0,
      plano: piece.PLANO || '',
      mod_plano: piece.MOD_PLANO || ''
    }));
    console.log('✅ Datos transformados');
    console.log('');
    
    // Insertar en lotes de 1000
    console.log('📥 Insertando datos en MongoDB...');
    const batchSize = 1000;
    let inserted = 0;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await collection.insertMany(batch);
      inserted += batch.length;
      const percentage = Math.round((inserted / documents.length) * 100);
      console.log(`   📥 Progreso: ${inserted}/${documents.length} (${percentage}%)`);
    }
    
    console.log('✅ Todos los datos insertados');
    console.log('');
    
    // Crear índices para mejorar rendimiento
    console.log('🔧 Creando índices para optimizar consultas...');
    await collection.createIndex({ tipo: 1 });
    await collection.createIndex({ fabricante: 1 });
    await collection.createIndex({ cabeza: 1 });
    await collection.createIndex({ parte_division: 1 });
    await collection.createIndex({ cuerpo: 1 });
    await collection.createIndex({ tramo: 1 });
    await collection.createIndex({ tipo: 1, fabricante: 1, cabeza: 1 });
    console.log('✅ Índices creados');
    console.log('');
    
    // Verificar migración
    const finalCount = await collection.countDocuments();
    console.log('═══════════════════════════════════════');
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Total de documentos migrados: ${finalCount}`);
    console.log(`📊 Documentos originales: ${pieces.length}`);
    
    if (finalCount === pieces.length) {
      console.log('✅ Todos los registros fueron migrados correctamente');
    } else {
      console.log('⚠️  Hay una diferencia en el número de registros');
    }
    
    console.log('');
    console.log('🎉 Puedes cerrar la conexión SQLite y eliminar desglose_torres.db');
    console.log('🎉 Tu aplicación ahora usará MongoDB Atlas');
    
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════');
    console.error('❌ ERROR DURANTE LA MIGRACIÓN');
    console.error('═══════════════════════════════════════');
    console.error(error);
    console.error('');
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('connect')) {
      console.error('💡 Verifica:');
      console.error('   1. Tu connection string de MongoDB');
      console.error('   2. Tu usuario y contraseña');
      console.error('   3. Que tu IP esté en la whitelist de MongoDB Atlas');
      console.error('   4. Tu conexión a internet');
    }
    
    process.exit(1);
  } finally {
    await client.close();
    db.close();
    console.log('');
    console.log('👋 Conexiones cerradas');
  }
}

// Ejecutar migración
migrate().catch(console.error);