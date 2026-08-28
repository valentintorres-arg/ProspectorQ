export type Fuente = 'osm' | 'google';

export type Etapa =
  | 'identificado'
  | 'contactado'
  | 'en_conversacion'
  | 'propuesta'
  | 'ganado'
  | 'perdido';

export const ETAPAS: { value: Etapa; label: string }[] = [
  { value: 'identificado', label: 'Identificado' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'en_conversacion', label: 'En conversación' },
  { value: 'propuesta', label: 'Propuesta enviada' },
  { value: 'ganado', label: 'Ganado' },
  { value: 'perdido', label: 'Perdido' },
];

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
  rating: number | null;
  enriquecido: boolean;
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

export interface Interaccion {
  id: string;
  lead_id: string;
  tipo: 'nota' | 'llamada' | 'mail' | 'reunion' | 'whatsapp';
  descripcion: string;
  created_at: string;
}
