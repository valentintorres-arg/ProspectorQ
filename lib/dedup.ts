import { distance, point } from '@turf/turf';

interface PuntoNombrado {
  lat: number;
  lng: number;
  nombre: string;
}

function normalizarNombre(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Distancia de edición clásica (programación dinámica). Sin librería: para
// nombres de comercio (pocas decenas de caracteres) es rápido de sobra.
function distanciaLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + costo);
    }
  }
  return dp[m][n];
}

function similitudNombres(a: string, b: string): number {
  const na = normalizarNombre(a);
  const nb = normalizarNombre(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // "Havanna" vs "Havanna Cafe Recoleta": uno contiene al otro -> muy probable el mismo lugar
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const maxLen = Math.max(na.length, nb.length);
  return 1 - distanciaLevenshtein(na, nb) / maxLen;
}

// Umbral pensado para negocios puntuales (no cadenas con muchas sucursales
// juntas): 40m es aprox una cuadra corta, 0.8 de similitud tolera variaciones
// menores de tipeo/mayúsculas/acentos pero no nombres distintos.
const RADIO_METROS = 40;
const UMBRAL_SIMILITUD = 0.8;

// Dos negocios se consideran "el mismo lugar" si están muy cerca Y el nombre
// es lo bastante parecido. Se usa para no duplicar cuando:
// - el mismo comercio quedó mapeado dos veces en OSM (un node y un way, ej.)
// - se vuelve a buscar sobre una zona superpuesta y OSM tiene una entidad
//   nueva para un lugar que ya habíamos guardado antes
export function sonElMismoNegocio(a: PuntoNombrado, b: PuntoNombrado): boolean {
  const metros = distance(point([a.lng, a.lat]), point([b.lng, b.lat]), { units: 'meters' });
  if (metros > RADIO_METROS) return false;
  return similitudNombres(a.nombre, b.nombre) >= UMBRAL_SIMILITUD;
}
