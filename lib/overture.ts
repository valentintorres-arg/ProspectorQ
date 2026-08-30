import duckdb from 'duckdb';

// Overture Maps Places: dataset abierto (CDLA Permissive 2.0) servido desde
// un bucket S3 público de AWS Open Data, sin costo por consulta y sin API
// key. Reemplaza a Overpass como fuente de búsqueda de zona: en pruebas
// sobre La Plata dio ~3.7x más negocios y pasó la cobertura de teléfono de
// 12.6% a 85.9% (ver conversación). No hay que descargar/hostear nada: se
// consulta el parquet directo por HTTP range-requests filtrando por bbox,
// que DuckDB resuelve leyendo solo los metadata/row-groups relevantes.
const BUCKET = 'overturemaps-us-west-2';
const REGION = 'us-west-2';

let connection: duckdb.Connection | null = null;

function getConnection(): Promise<duckdb.Connection> {
  if (connection) return Promise.resolve(connection);
  return new Promise((resolve, reject) => {
    const db = new duckdb.Database(':memory:');
    const con = db.connect();
    // En serverless (Vercel/Lambda) el $HOME por default no es escribible —
    // solo /tmp lo es. Sin esto, INSTALL httpfs intenta bajar la extensión a
    // ~/.duckdb y el proceso nativo muere sin tirar un error de JS atajable
    // (502 sin body en vez de un error prolijo).
    con.exec(
      `SET home_directory='/tmp'; INSTALL httpfs; LOAD httpfs; SET s3_region='${REGION}';`,
      (err) => {
        if (err) return reject(err);
        connection = con;
        resolve(con);
      }
    );
  });
}

let releaseCache: { version: string; fetchedAt: number } | null = null;
const RELEASE_TTL_MS = 6 * 60 * 60 * 1000; // Overture publica releases ~mensuales, 6h de cache alcanza de sobra

async function resolverUltimaRelease(): Promise<string> {
  if (releaseCache && Date.now() - releaseCache.fetchedAt < RELEASE_TTL_MS) {
    return releaseCache.version;
  }

  const res = await fetch(
    `https://${BUCKET}.s3.amazonaws.com/?list-type=2&prefix=release/&delimiter=/`
  );
  if (!res.ok) throw new Error(`No se pudo listar releases de Overture (HTTP ${res.status})`);
  const xml = await res.text();

  const versiones = [...xml.matchAll(/<Prefix>release\/([^<]+)\/<\/Prefix>/g)].map((m) => m[1]);
  if (versiones.length === 0) throw new Error('Overture no devolvió ningún release disponible');

  const ultima = versiones.sort().at(-1)!;
  releaseCache = { version: ultima, fetchedAt: Date.now() };
  return ultima;
}

interface OvertureSource {
  provider: string | null;
  update_time: string | null;
}

interface OvertureRow {
  id: string;
  nombre: string | null;
  rubro: string | null;
  phones: string[] | null;
  websites: string[] | null;
  direccion: string | null;
  lng: number;
  lat: number;
  sources: OvertureSource[] | null;
}

export interface CandidatoOverture {
  overture_id: string;
  nombre: string;
  rubro: string | null;
  direccion: string | null;
  telefono: string | null;
  web: string | null;
  lat: number;
  lng: number;
  ultima_actualizacion: string | null;
}

// El array `sources` de Overture mezcla proveedores de datos reales (meta,
// microsoft, osm...) con una entrada propia de Overture que solo registra
// cuándo recalcularon el score de confianza — esa entrada se actualiza casi
// a diario y no dice nada sobre el negocio en sí, así que la excluimos o el
// dato de "última actualización" mentiría mostrando todo como recién
// verificado.
function ultimaActualizacionReal(sources: OvertureSource[] | null): string | null {
  if (!sources) return null;
  const fechas = sources
    .filter((s) => s.provider && s.provider !== 'overture' && s.update_time)
    .map((s) => new Date(s.update_time!).getTime())
    .filter((t) => !Number.isNaN(t));
  if (fechas.length === 0) return null;
  return new Date(Math.max(...fechas)).toISOString();
}

export async function buscarNegociosOverture(
  bbox: [number, number, number, number]
): Promise<CandidatoOverture[]> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const release = await resolverUltimaRelease();
  const con = await getConnection();

  const sql = `
    SELECT
      id,
      names.primary AS nombre,
      coalesce(categories.primary, basic_category) AS rubro,
      phones,
      websites,
      addresses[1].freeform AS direccion,
      bbox.xmin AS lng,
      bbox.ymin AS lat,
      sources
    FROM read_parquet(
      's3://${BUCKET}/release/${release}/theme=places/type=place/*',
      hive_partitioning = 1
    )
    WHERE bbox.xmin BETWEEN ${minLng} AND ${maxLng}
      AND bbox.ymin BETWEEN ${minLat} AND ${maxLat}
      AND names.primary IS NOT NULL
  `;

  const rows = await new Promise<OvertureRow[]>((resolve, reject) => {
    con.all(sql, (err, res) => {
      if (err) return reject(err);
      resolve(res as unknown as OvertureRow[]);
    });
  });

  return rows.map((r) => ({
    overture_id: r.id,
    nombre: r.nombre!,
    rubro: r.rubro,
    direccion: r.direccion,
    telefono: r.phones?.[0] ?? null,
    web: r.websites?.[0] ?? null,
    lat: r.lat,
    lng: r.lng,
    ultima_actualizacion: ultimaActualizacionReal(r.sources),
  }));
}
