export type Fuente = 'osm' | 'google' | 'overture';

export type Etapa =
  | 'identificado'
  | 'contactado'
  | 'en_conversacion'
  | 'propuesta'
  | 'ganado'
  | 'perdido';

// Solo los valores (claves internas, nunca se muestran tal cual): el label
// para mostrar se resuelve por idioma vía t.etapas[value] (ver lib/i18n).
export const ETAPAS: Etapa[] = [
  'identificado',
  'contactado',
  'en_conversacion',
  'propuesta',
  'ganado',
  'perdido',
];

export interface Zona {
  id: string;
  nombre: string;
  created_at: string;
  negocios_count: number;
}

export interface Negocio {
  id: string;
  zona_id: string | null;
  nombre: string;
  direccion: string | null;
  rubro: string | null;
  telefono: string | null;
  web: string | null;
  lat: number;
  lng: number;
  fuente: Fuente;
  osm_id: string | null;
  google_place_id: string | null;
  overture_id: string | null;
  rating: number | null;
  enriquecido: boolean;
  // Fecha del dato fuente más reciente (no de cuándo lo insertamos nosotros).
  // Sirve para desconfiar de negocios que nadie verificó hace mucho tiempo
  // (posible cierre). Solo lo completa la fuente Overture por ahora.
  ultima_actualizacion: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  negocio_id: string;
  etapa: Etapa;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  negocio?: Negocio;
}

export type TipoInteraccion = 'nota' | 'llamada' | 'mail' | 'reunion' | 'whatsapp';

// Ídem ETAPAS: solo valores, el label sale de t.interacciones[value].
export const TIPOS_INTERACCION: TipoInteraccion[] = ['nota', 'llamada', 'mail', 'reunion', 'whatsapp'];

export interface Interaccion {
  id: string;
  lead_id: string;
  tipo: TipoInteraccion;
  descripcion: string;
  created_at: string;
}
