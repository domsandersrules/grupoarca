import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '../src');

// Lista de tonos de color estándar en Tailwind CSS
const standardNumbers = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const colorNames = '(zinc|slate|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';

// Expresión regular para capturar clases de color de la paleta estándar
const colorRegex = new RegExp(`(?:bg|text|border|ring|from|to|via|outline|divide|placeholder|accent)-${colorNames}-(\\d+)`, 'g');

let errorsFound = false;

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walkDir(fullPath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      let match;
      // Reiniciar índice regex
      colorRegex.lastIndex = 0;
      while ((match = colorRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const num = match[2];
        if (!standardNumbers.includes(num)) {
          console.error(`❌ Clase de color inválida encontrada en ${path.relative(srcDir, fullPath)}: "${fullMatch}" (${num} no es un tono estándar de Tailwind)`);
          errorsFound = true;
        }
      }
    }
  }
}

console.log('🔍 Iniciando verificación de clases de color de Tailwind CSS...');
try {
  walkDir(srcDir);
} catch (error) {
  console.error('Error al escanear los directorios:', error);
  process.exit(1);
}

if (errorsFound) {
  console.error('\n⚠️ Error: Se encontraron clases de color de Tailwind CSS inválidas en el código.');
  console.error('Por favor, corrígelas usando los tonos estándar: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950.');
  process.exit(1);
} else {
  console.log('✅ Éxito: Todas las clases de color de Tailwind CSS en el proyecto son válidas.');
}
