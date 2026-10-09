// Prohibe los tamanos de texto arbitrarios (text-[10px], text-[0.7rem]...).
//
// La app usa la escala de Tailwind: text-xs (12px) es el minimo y text-sm (14px) el cuerpo.
// Un tamano suelto en una pantalla es como se llego a tener 370 textos de 7 a 11 px.
//
//   npm run lint:text-sizes
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arbitrarySize = /text-\[\d+(?:\.\d+)?(?:px|rem|em)\]/g;

// Excepciones: ilustraciones que reproducen la app a escala reducida. No son texto de
// interfaz; llevarlas a 12px las rompe. Cada una dice por que existe.
const ALLOWED = {
  'src/pages/LandingPage.tsx': 'maqueta decorativa de un celular con la app en miniatura',
};

const offenders = [];
for (const entry of readdirSync(join(root, 'src'), { recursive: true })) {
  if (!/\.(ts|tsx)$/.test(entry)) continue;
  const file = `src/${entry.split(sep).join('/')}`;
  if (file in ALLOWED) continue;
  const found = readFileSync(join(root, 'src', entry), 'utf8').match(arbitrarySize);
  if (found) offenders.push([file, found.length]);
}

if (offenders.length > 0) {
  console.error('Tamanos de texto arbitrarios (usa text-xs o text-sm):');
  for (const [file, count] of offenders) console.error(`  ${file}: ${count}`);
  process.exit(1);
}
