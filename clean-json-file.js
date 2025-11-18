// clean-json.js
// Primero ejecuta: node clean-json.js
// Luego ejecuta: node import-json-to-mongodb.js

const fs = require('fs');

const INPUT_FILE = 'desgloses_mongodb.json';
const OUTPUT_FILE = 'desgloses_mongodb_clean.json';

console.log('🧹 Limpiando archivo JSON...');
console.log('');

try {
  // Leer archivo como texto
  console.log(`📂 Leyendo: ${INPUT_FILE}`);
  let content = fs.readFileSync(INPUT_FILE, 'utf-8');
  
  console.log(`📊 Tamaño original: ${(content.length / 1024).toFixed(2)} KB`);
  console.log('');
  
  console.log('🔧 Aplicando correcciones...');
  
  // Contar cuántas veces aparece cada problema
  const nanCount = (content.match(/:\s*NaN/g) || []).length;
  const infCount = (content.match(/:\s*Infinity/g) || []).length;
  const undefCount = (content.match(/:\s*undefined/g) || []).length;
  
  console.log(`   • NaN encontrados: ${nanCount}`);
  console.log(`   • Infinity encontrados: ${infCount}`);
  console.log(`   • undefined encontrados: ${undefCount}`);
  console.log('');
  
  // Reemplazar valores inválidos
  content = content.replace(/:\s*NaN/g, ': null');
  content = content.replace(/:\s*Infinity/g, ': null');
  content = content.replace(/:\s*-Infinity/g, ': null');
  content = content.replace(/:\s*undefined/g, ': null');
  
  // Intentar parsear
  console.log('✓ Valores inválidos reemplazados con null');
  console.log('');
  
  console.log('🔍 Verificando JSON...');
  const data = JSON.parse(content);
  
  let documents;
  if (Array.isArray(data)) {
    documents = data;
  } else {
    // Buscar el array dentro del objeto
    const arrays = Object.values(data).filter(v => Array.isArray(v));
    if (arrays.length > 0) {
      documents = arrays[0];
    } else {
      throw new Error('No se encontró un array en el JSON');
    }
  }
  
  console.log(`✅ JSON válido con ${documents.length} documentos`);
  console.log('');
  
  // Limpiar cada documento
  console.log('🧹 Limpiando documentos...');
  let removedFields = 0;
  let cleanedDocs = 0;
  
  const cleanDocuments = documents.map(doc => {
    const clean = {};
    
    for (const [key, value] of Object.entries(doc)) {
      // Limpiar nombre de campo
      const cleanKey = key.trim().replace(/^["']|["']$/g, '');
      
      // Saltar campos Unnamed o vacíos
      if (!cleanKey || cleanKey.startsWith('Unnamed')) {
        removedFields++;
        continue;
      }
      
      // Limpiar valor
      if (value === null || value === undefined || value === 'NaN' || 
          value === 'null' || value === 'undefined' || value === '') {
        clean[cleanKey] = null;
      } else if (typeof value === 'string') {
        const trimmed = value.trim();
        clean[cleanKey] = trimmed === '' ? null : trimmed;
      } else if (typeof value === 'number' && !isFinite(value)) {
        clean[cleanKey] = null;
      } else {
        clean[cleanKey] = value;
      }
    }
    
    if (Object.keys(clean).length > 0) {
      cleanedDocs++;
      return clean;
    }
    return null;
  }).filter(doc => doc !== null);
  
  console.log(`   • Campos 'Unnamed' eliminados: ${removedFields}`);
  console.log(`   • Documentos válidos: ${cleanedDocs}`);
  console.log('');
  
  // Guardar archivo limpio
  console.log(`💾 Guardando archivo limpio: ${OUTPUT_FILE}`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleanDocuments, null, 2), 'utf-8');
  
  const newSize = fs.statSync(OUTPUT_FILE).size;
  console.log(`✅ Archivo guardado: ${(newSize / 1024).toFixed(2)} KB`);
  console.log('');
  
  console.log('═══════════════════════════════════════');
  console.log('✅ LIMPIEZA COMPLETADA!');
  console.log('═══════════════════════════════════════');
  console.log(`📂 Archivo original: ${INPUT_FILE}`);
  console.log(`📂 Archivo limpio: ${OUTPUT_FILE}`);
  console.log(`📊 Documentos: ${cleanDocuments.length}`);
  console.log('');
  console.log('🚀 Ahora ejecuta:');
  console.log(`   node import-json-to-mongodb.js`);
  console.log('');
  console.log('💡 Recuerda actualizar JSON_FILE en el script de importación a:');
  console.log(`   const JSON_FILE = '${OUTPUT_FILE}';`);
  
} catch (error) {
  console.error('');
  console.error('❌ Error:', error.message);
  console.error('');
  
  if (error.message.includes('Unexpected token')) {
    console.error('💡 El JSON tiene errores de sintaxis que no pudieron corregirse automáticamente.');
    console.error('   Opciones:');
    console.error('   1. Regenera el JSON desde el CSV usando el script de Python');
    console.error('   2. Abre el archivo y busca manualmente el error en la línea mencionada');
  }
  
  process.exit(1);
}