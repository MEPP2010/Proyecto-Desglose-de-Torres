// import-json-to-mongodb.js
// Ejecuta: node import-json-to-mongodb.js

const { MongoClient } = require('mongodb');
const fs = require('fs');

// ==================== CONFIGURACIÓN ====================
const MONGODB_URI = 'mongodb+srv://martinp_db:c51ObWgDOgN1KTOw@desglosetorres.js1iput.mongodb.net/torres?retryWrites=true&w=majority';
const DATABASE_NAME = 'torres';
const COLLECTION_NAME = 'piezas';
const JSON_FILE = 'desgloses_mongodb.json'; // Tu archivo JSON
// =======================================================

async function importJSON() {
  console.log('🚀 Iniciando importación de JSON a MongoDB Atlas...');
  console.log('');
  
  // 1. Verificar que existe el archivo JSON
  if (!fs.existsSync(JSON_FILE)) {
    console.error(`❌ Error: No se encontró el archivo ${JSON_FILE}`);
    console.error('   Asegúrate de que el archivo esté en la misma carpeta');
    process.exit(1);
  }
  
  // 2. Leer el archivo JSON (como texto para limpiarlo)
  console.log(`📂 Leyendo archivo: ${JSON_FILE}`);
  let fileContent = fs.readFileSync(JSON_FILE, 'utf-8');
  
  console.log('🧹 Limpiando datos inválidos...');
  
  // Reemplazar NaN con null
  fileContent = fileContent.replace(/:\s*NaN/g, ': null');
  
  // Reemplazar Infinity con null
  fileContent = fileContent.replace(/:\s*Infinity/g, ': null');
  fileContent = fileContent.replace(/:\s*-Infinity/g, ': null');
  
  // Reemplazar undefined con null
  fileContent = fileContent.replace(/:\s*undefined/g, ': null');
  
  console.log('✅ Datos limpiados');
  
  let documents;
  try {
    documents = JSON.parse(fileContent);
    
    // Si es un objeto con un array dentro, extraerlo
    if (!Array.isArray(documents)) {
      if (documents.data) {
        documents = documents.data;
      } else if (documents.records) {
        documents = documents.records;
      } else {
        // Intentar encontrar el primer array en el objeto
        const firstArray = Object.values(documents).find(v => Array.isArray(v));
        if (firstArray) {
          documents = firstArray;
        } else {
          throw new Error('No se encontró un array de documentos en el JSON');
        }
      }
    }
    
    console.log(`✅ Archivo parseado correctamente`);
    console.log(`📊 Total de documentos: ${documents.length}`);
    console.log('');
    
    // 3. Limpiar cada documento
    console.log('🧹 Limpiando documentos individuales...');
    documents = documents.map(doc => {
      const cleanDoc = {};
      
      for (const [key, value] of Object.entries(doc)) {
        // Limpiar nombre de campo (quitar comillas extras, espacios)
        let cleanKey = key.trim().replace(/^["']|["']$/g, '');
        
        // Evitar campos vacíos o que empiecen con "Unnamed"
        if (!cleanKey || cleanKey.startsWith('Unnamed')) {
          continue;
        }
        
        // Limpiar valor
        if (value === null || value === undefined || value === 'NaN' || value === 'null') {
          cleanDoc[cleanKey] = null;
        } else if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed === '' || trimmed === 'NaN' || trimmed === 'null' || trimmed === 'undefined') {
            cleanDoc[cleanKey] = null;
          } else {
            cleanDoc[cleanKey] = trimmed;
          }
        } else if (typeof value === 'number' && !isFinite(value)) {
          cleanDoc[cleanKey] = null;
        } else {
          cleanDoc[cleanKey] = value;
        }
      }
      
      return cleanDoc;
    });
    
    // Filtrar documentos vacíos
    const originalLength = documents.length;
    documents = documents.filter(doc => Object.keys(doc).length > 0);
    
    if (originalLength !== documents.length) {
      console.log(`⚠️  Se eliminaron ${originalLength - documents.length} documentos vacíos`);
    }
    
    console.log(`✅ ${documents.length} documentos listos para importar`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error al procesar JSON:', error.message);
    console.error('');
    console.error('💡 Intenta regenerar el JSON desde el CSV usando el script de Python');
    process.exit(1);
  }
  
  // 4. Conectar a MongoDB
  console.log('🔌 Conectando a MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB Atlas');
    console.log('');
    
    const database = client.db(DATABASE_NAME);
    const collection = database.collection(COLLECTION_NAME);
    
    // 5. Verificar si ya hay datos
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Ya existen ${existingCount} documentos en la colección "${COLLECTION_NAME}"`);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('¿Quieres reemplazarlos? (s/n): ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() === 's') {
        console.log('🧹 Limpiando colección...');
        await collection.deleteMany({});
        console.log('✅ Colección limpiada');
        console.log('');
      } else {
        console.log('❌ Importación cancelada');
        await client.close();
        process.exit(0);
      }
    }
    
    // 6. Insertar documentos en lotes
    console.log('📥 Insertando documentos en MongoDB...');
    const batchSize = 500;
    let inserted = 0;
    let errors = 0;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      try {
        const result = await collection.insertMany(batch, { ordered: false });
        inserted += result.insertedCount;
      } catch (error) {
        // Continuar incluso si hay errores en algunos documentos
        inserted += batch.length - (error.writeErrors?.length || 0);
        errors += error.writeErrors?.length || 0;
      }
      
      const percentage = Math.round((inserted / documents.length) * 100);
      console.log(`   📥 Progreso: ${inserted}/${documents.length} (${percentage}%)`);
    }
    
    if (errors > 0) {
      console.log(`⚠️  ${errors} documentos no pudieron ser insertados`);
    }
    
    console.log('✅ Inserción completada');
    console.log('');
    
    // 7. Crear índices para optimizar consultas
    console.log('🔧 Creando índices...');
    
    try {
      // Índices basados en la estructura de tu CSV
      await collection.createIndex({ "Hoja_Origen": 1 });
      await collection.createIndex({ "TIPO": 1 });
      await collection.createIndex({ "FABRICANTE": 1 });
      await collection.createIndex({ "Parte (Division)": 1 });
      await collection.createIndex({ "Cabeza": 1 });
      await collection.createIndex({ "Cuerpo": 1 });
      await collection.createIndex({ "Tramo": 1 });
      
      console.log('   ✓ Índices creados');
    } catch (error) {
      console.log('   ⚠️  Algunos índices no pudieron crearse (normal si ya existen)');
    }
    
    console.log('✅ Índices configurados');
    console.log('');
    
    // 8. Verificar importación
    const finalCount = await collection.countDocuments();
    
    console.log('═══════════════════════════════════════');
    console.log('✅ IMPORTACIÓN COMPLETADA!');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Documentos importados: ${finalCount}`);
    console.log(`📊 Documentos procesados: ${documents.length}`);
    console.log(`🗄️  Base de datos: ${DATABASE_NAME}`);
    console.log(`📋 Colección: ${COLLECTION_NAME}`);
    
    if (finalCount === documents.length) {
      console.log('✅ Todos los documentos fueron importados correctamente');
    } else {
      console.log(`⚠️  Diferencia de ${Math.abs(finalCount - documents.length)} documentos`);
    }
    
    console.log('');
    console.log('🎉 Tu base de datos está lista en MongoDB Atlas!');
    
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════');
    console.error('❌ ERROR DURANTE LA IMPORTACIÓN');
    console.error('═══════════════════════════════════════');
    console.error(error.message);
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
    console.log('');
    console.log('👋 Conexión cerrada');
  }
}

// Ejecutar importación
importJSON().catch(console.error);